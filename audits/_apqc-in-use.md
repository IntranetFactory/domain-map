# APQC processes in use — catalog-wide snapshot history

Append-only log of catalog-wide snapshots showing which APQC PCF activities are referenced by `handoff_processes` rows. Each snapshot is a dated section appended at the bottom; never overwrite.

Mirrors the convention of [_discover.md](_discover.md) and [_validate-cross-domain.md](_validate-cross-domain.md) — catalog-scoped, append-only, underscore-prefixed.

---

## 2026-05-30 — APQC processes in use (snapshot)

Catalog-wide snapshot of which APQC PCF activities are referenced by `handoff_processes` rows. Re-run via [scripts/analytics/validate_cross_domain.ts](../scripts/analytics/validate_cross_domain.ts) plus the ad-hoc aggregation in `c:/tmp/`; promote to a dedicated script if this snapshot becomes a routine deliverable.

### Headline

- **93 distinct PCF activities** referenced across **203 `handoff_processes` rows**
- All entries are `apqc_pcf_cross_industry` (no custom processes yet)
- **0 approved** (Rule #1 review pending across the board)
- Provenance: 0 `human_curated` / 41 `agent_curated` / 45 `discovery_override` / 117 `discovery_substring`

### Reference-count distribution

| Tier | Distinct processes |
|---|---:|
| 1 refs | 47 |
| 20+ refs | 1 |
| 10-19 refs | 0 |
| 5-9 refs | 4 |
| 2-4 refs | 41 |

### Full list (sorted by reference count)

| Refs | Human | Agent | Override | Substring | Approved | PCF ext | Lvl | Process name |
|---:|---:|---:|---:|---:|---:|---|---:|---|
| 22 | 0 | 0 | 22 | 0 | 0 | 20599 | L2 | Manage employee onboarding, training, and development |
| 8 | 0 | 1 | 7 | 0 | 0 | 10388 | L3 | Manage customer service problems, requests, and inquiries |
| 7 | 0 | 0 | 7 | 0 | 0 | 10469 | L3 | Manage employee onboarding |
| 5 | 0 | 0 | 0 | 5 | 0 | 14095 | L3 | Document trade |
| 5 | 0 | 0 | 0 | 5 | 0 | 10505 | L4 | Administer benefit enrollment |
| 4 | 0 | 0 | 0 | 4 | 0 | 10733 | L2 | Process accounts payable and expense reimbursements |
| 4 | 0 | 3 | 0 | 1 | 0 | 11779 | L3 | Develop and manage sales proposals, bids, and quotes |
| 4 | 0 | 0 | 4 | 0 | 0 | 10280 | L3 | Manage suppliers |
| 4 | 0 | 0 | 0 | 4 | 0 | 21698 | L3 | Manage employee requisitions |
| 4 | 0 | 0 | 0 | 4 | 0 | 10440 | L3 | Recruit/Source candidates |
| 4 | 0 | 0 | 0 | 4 | 0 | 16944 | L3 | Conduct employee engagement surveys |
| 4 | 0 | 0 | 0 | 4 | 0 | 20740 | L4 | Review and monitor application security controls |
| 4 | 0 | 0 | 4 | 0 | 0 | 10862 | L4 | Process and distribute payments |
| 4 | 0 | 4 | 0 | 0 | 0 | 10192 | L5 | Close the sale |
| 3 | 0 | 0 | 0 | 3 | 0 | 10148 | L3 | Establish goals, objectives, and measures for products/services by channel/segment |
| 3 | 0 | 3 | 0 | 0 | 0 | 10222 | L3 | Manage demand for products |
| 3 | 0 | 0 | 0 | 3 | 0 | 11043 | L3 | Report audit findings |
| 3 | 0 | 0 | 0 | 3 | 0 | 19954 | L4 | Establish baseline metrics |
| 3 | 0 | 0 | 0 | 3 | 0 | 10083 | L4 | Assign resources to product/service project |
| 3 | 0 | 0 | 0 | 3 | 0 | 10295 | L4 | Create/Distribute purchase orders |
| 3 | 0 | 3 | 0 | 0 | 0 | 20903 | L4 | Triage IT service delivery incidents |
| 3 | 0 | 1 | 0 | 2 | 0 | 10773 | L4 | Prepare periodic financial forecasts |
| 3 | 0 | 0 | 0 | 3 | 0 | 19965 | L5 | Create customer journey maps |
| 2 | 0 | 0 | 0 | 2 | 0 | 20085 | L1 | Manage Customer Service |
| 2 | 0 | 0 | 0 | 2 | 0 | 17058 | L1 | Manage Financial Resources |
| 2 | 0 | 0 | 0 | 2 | 0 | 19207 | L1 | Acquire, Construct, and Manage Assets |
| 2 | 0 | 0 | 0 | 2 | 0 | 10016 | L2 | Develop and measure strategic initiatives |
| 2 | 0 | 0 | 0 | 2 | 0 | 20110 | L2 | Manage product recalls and regulatory audits |
| 2 | 0 | 0 | 0 | 2 | 0 | 10728 | L2 | Perform planning and management accounting |
| 2 | 0 | 0 | 0 | 2 | 0 | 10729 | L2 | Perform revenue accounting |
| 2 | 0 | 0 | 0 | 2 | 0 | 10735 | L2 | Manage internal controls |
| 2 | 0 | 0 | 0 | 2 | 0 | 10018 | L3 | Survey market and determine customer needs and wants |
| 2 | 0 | 2 | 0 | 0 | 0 | 10183 | L3 | Manage customers and accounts |
| 2 | 0 | 2 | 0 | 0 | 0 | 10277 | L3 | Provide sourcing governance |
| 2 | 0 | 0 | 0 | 2 | 0 | 20743 | L3 | Conduct and analyze IT compliance assessments |
| 2 | 0 | 0 | 0 | 2 | 0 | 10760 | L3 | Manage in-house bank accounts |
| 2 | 0 | 0 | 0 | 2 | 0 | 10941 | L3 | Develop property strategy and long term vision |
| 2 | 0 | 0 | 0 | 2 | 0 | 11750 | L4 | Review and approve data access requests |
| 2 | 0 | 0 | 0 | 2 | 0 | 10175 | L4 | Analyze customer attrition and retention rates |
| 2 | 0 | 0 | 0 | 2 | 0 | 10197 | L4 | Determine fulfillment process |
| 2 | 0 | 0 | 0 | 2 | 0 | 12046 | L4 | Perform root cause analysis |
| 2 | 0 | 0 | 0 | 2 | 0 | 10511 | L4 | Review compensation plan |
| 2 | 0 | 2 | 0 | 0 | 0 | 20829 | L4 | Define IT change/release standards |
| 2 | 0 | 0 | 0 | 2 | 0 | 20893 | L4 | Plan and budget IT license usage volumes |
| 2 | 0 | 0 | 0 | 2 | 0 | 20136 | L4 | Perform variance analysis against forecasts and budgets |
| 2 | 0 | 0 | 0 | 2 | 0 | 10931 | L4 | Prepare tax returns |
| 1 | 0 | 1 | 0 | 0 | 0 | 10004 | L1 | Market and Sell Products and Services |
| 1 | 0 | 1 | 0 | 0 | 0 | 16437 | L1 | Manage Enterprise Risk, Compliance, Remediation, and Resiliency |
| 1 | 0 | 0 | 0 | 1 | 0 | 10012 | L1 | Manage External Relationships |
| 1 | 0 | 1 | 0 | 0 | 0 | 21634 | L2 | Manage and Operate Service Delivery System |
| 1 | 0 | 0 | 0 | 1 | 0 | 20866 | L2 | Create and manage support services/solutions |
| 1 | 0 | 0 | 0 | 1 | 0 | 10737 | L2 | Manage international funds/consolidation |
| 1 | 0 | 1 | 0 | 0 | 0 | 11013 | L2 | Manage legal and ethical issues |
| 1 | 0 | 0 | 1 | 0 | 0 | 10185 | L3 | Manage sales orders |
| 1 | 0 | 0 | 0 | 1 | 0 | 10224 | L3 | Create and manage master production schedule |
| 1 | 0 | 1 | 0 | 0 | 0 | 10279 | L3 | Order materials and services |
| 1 | 0 | 1 | 0 | 0 | 0 | 10218 | L3 | Service products |
| 1 | 0 | 1 | 0 | 0 | 0 | 20114 | L3 | Submit regulatory reports |
| 1 | 0 | 1 | 0 | 0 | 0 | 10401 | L3 | Measure customer satisfaction with customer problems, requests, and inquiries handling |
| 1 | 0 | 1 | 0 | 0 | 0 | 20756 | L3 | Manage IT user identity and authorization |
| 1 | 0 | 1 | 0 | 0 | 0 | 20921 | L3 | Operate IT user support |
| 1 | 0 | 1 | 0 | 0 | 0 | 10741 | L3 | Evaluate and manage financial performance |
| 1 | 0 | 1 | 0 | 0 | 0 | 10744 | L3 | Process accounts receivable (AR) |
| 1 | 0 | 0 | 0 | 1 | 0 | 10752 | L3 | Perform capital project accounting |
| 1 | 0 | 0 | 0 | 1 | 0 | 20929 | L3 | Manage corporate credit cards |
| 1 | 0 | 0 | 0 | 1 | 0 | 11201 | L3 | Create remediation plans |
| 1 | 0 | 0 | 0 | 1 | 0 | 17492 | L3 | Manage non-conformance |
| 1 | 0 | 0 | 0 | 1 | 0 | 16817 | L4 | Provide warranty-related recommendations |
| 1 | 0 | 0 | 0 | 1 | 0 | 10094 | L4 | Conduct customer tests and interviews |
| 1 | 0 | 0 | 0 | 1 | 0 | 19640 | L4 | Conduct brand level social sentiment analysis |
| 1 | 0 | 0 | 0 | 1 | 0 | 16575 | L4 | Monitor and report events influencing factors |
| 1 | 0 | 0 | 0 | 1 | 0 | 18925 | L4 | Acquire members to customer loyalty program |
| 1 | 0 | 1 | 0 | 0 | 0 | 18115 | L4 | Validate and qualify leads/opportunities |
| 1 | 0 | 0 | 0 | 1 | 0 | 10209 | L4 | Determine sales resource allocation |
| 1 | 0 | 0 | 0 | 1 | 0 | 10258 | L4 | Calculate and optimize destination dispatch plan |
| 1 | 0 | 0 | 0 | 1 | 0 | 10285 | L4 | Analyze organization’s spend profile |
| 1 | 0 | 0 | 0 | 1 | 0 | 10308 | L4 | Schedule production orders and create lots |
| 1 | 0 | 0 | 0 | 1 | 0 | 10315 | L4 | Plan for preventive maintenance |
| 1 | 0 | 1 | 0 | 0 | 0 | 10395 | L4 | Resolve customer problems, requests, and inquiries |
| 1 | 0 | 0 | 0 | 1 | 0 | 10426 | L4 | Develop succession plan |
| 1 | 0 | 0 | 0 | 1 | 0 | 10455 | L4 | Manage recruitment vendors |
| 1 | 0 | 0 | 0 | 1 | 0 | 10515 | L4 | Manage leave of absence |
| 1 | 0 | 1 | 0 | 0 | 0 | 20689 | L4 | Manage IT projects and services interdependencies |
| 1 | 0 | 0 | 0 | 1 | 0 | 20722 | L4 | Evaluate enterprise regulatory and compliance obligations |
| 1 | 0 | 1 | 0 | 0 | 0 | 20847 | L4 | Document IT change/release outcome |
| 1 | 0 | 0 | 0 | 1 | 0 | 20849 | L4 | Confirm hardware/software operational status |
| 1 | 0 | 1 | 0 | 0 | 0 | 20898 | L4 | Maintain service support knowledge repository |
| 1 | 0 | 1 | 0 | 0 | 0 | 10778 | L4 | Determine key cost drivers |
| 1 | 0 | 1 | 0 | 0 | 0 | 10796 | L4 | Transmit billing data to customers |
| 1 | 0 | 0 | 0 | 1 | 0 | 10823 | L4 | Post and reconcile intercompany transactions |
| 1 | 0 | 0 | 0 | 1 | 0 | 10833 | L4 | Calculate and record depreciation expense |
| 1 | 0 | 0 | 0 | 1 | 0 | 12878 | L4 | Plan and manage meetings |
| 1 | 0 | 1 | 0 | 0 | 0 | 16413 | L4 | Develop project plans |

### Quality observations

1. **`20599` (L2) carries 22 refs from the curated `employee.*` override; its L3 child `10469` carries 7 refs from the curated `task.*` override.** Same employee-prefix cluster mapped at two different PCF levels. Candidate for consolidation during Discover Pass 3 review — collapse to one or the other, probably the L3 for orchestration specificity.
2. **6 L1 entries in use.** L1 is the top of the PCF tree; substring matches that land at L1 almost certainly should be more-specific L3/L4 children. Quality concern flagged for Pass 3 review.
3. **Long tail dominates.** Half the distinct processes (47 of 93) have exactly one reference; another 41 have 2-4 refs. Only 5 processes have 5+ refs. The cluster shape is very flat — Discover Pass 3 review will need to decide whether each long-tail tag is genuinely useful or noise from over-eager substring matching.
4. **Zero `human_curated`** — no user has explicitly typed *"add tag X for handoff Y"* yet. Expected; the agent_curated rows came from the ITSM b1 audit fix-loop.
5. **Zero `approved` across all 203 rows** — Discover Pass 3 (review queue) has never been run. The headline catalog quality measure is currently zero.

---

## 2026-05-30 — All 203 handoff_processes rows grouped by PCF activity

Legend: [H] human_curated  [A] agent_curated  [O] discovery_override  [S] discovery_substring

### 20599 L2 — Manage employee onboarding, training, and development (22)
- [O] h=348  HCM → AGENCY-MGMT  `employee.terminated`  payload=agency_time_entries
- [O] h=20  HCM → ATS  `employee.terminated`  payload=job_requisitions
- [O] h=122  HCM → BEN-ADMIN  `employee.terminated`  payload=benefit_enrollments
- [O] h=367  HCM → BEN-ADMIN  `employee.terminated`  payload=employees
- [O] h=371  HCM → BEN-ADMIN  `employee.created`  payload=employees
- [O] h=123  HCM → COMP-MGMT  `employee.promoted`  payload=employees
- [O] h=372  HCM → COMP-MGMT  `employee.created`  payload=employees
- [O] h=468  HCM → EXPENSE  `employee.terminated`  payload=employees
- [O] h=369  HCM → HRSD  `employee.terminated`  payload=employees
- [O] h=19  HCM → IGA  `employee.created`  payload=employees
- [O] h=185  HCM → IGA  `employee.terminated`  payload=employees
- [O] h=375  HCM → IGA  `employee.promoted`  payload=employees
- [O] h=34  HCM → ITAM  `employee.terminated`  payload=asset_lifecycle_events
- [O] h=186  HCM → ITSM  `employee.terminated`  payload=service_requests
- [O] h=373  HCM → LMS  `employee.created`  payload=employees
- [O] h=3  HCM → ONBOARDING  `employee.created`  payload=onboarding_journeys
- [O] h=18  HCM → PAYROLL  `employee.created`  payload=employees
- [O] h=366  HCM → PAYROLL  `employee.terminated`  payload=employees
- [O] h=374  HCM → PAYROLL  `employee.promoted`  payload=employees
- [O] h=22  HCM → TALENT-MGMT  `employee.created`  payload=employees
- [O] h=376  HCM → TALENT-MGMT  `employee.promoted`  payload=employees
- [O] h=134  HCM → WFM  `employee.created`  payload=employees

### 10388 L3 — Manage customer service problems, requests, and inquiries (8)
- [A] h=520  CLM → CSM  `contract_obligation.due`  payload=contract_obligations
- [O] h=77  CSM → CDP  `case.created`  payload=customer_events
- [O] h=70  CSM → CRM  `case.critical_health_drop`  payload=customers
- [O] h=487  CSM → CRM  `case.created`  payload=customer_cases
- [O] h=73  CSM → SUB-MGMT  `case.churn_risk_detected`  payload=dunning_events
- [O] h=446  HRSD → HCM  `case.access_required`  payload=hr_cases
- [O] h=119  HRSD → IGA  `case.access_required`  payload=hr_cases
- [O] h=29  HRSD → ITSM  `case.it_assistance_required`  payload=service_requests

### 10469 L3 — Manage employee onboarding (7)
- [O] h=9  ONBOARDING → HRSD  `task.escalation_required`  payload=onboarding_tasks
- [O] h=5  ONBOARDING → IGA  `task.access_provisioning_required`  payload=onboarding_tasks
- [O] h=407  ONBOARDING → IGA  `task.it_provisioning_required`  payload=onboarding_tasks
- [O] h=4  ONBOARDING → ITSM  `task.it_provisioning_required`  payload=onboarding_tasks
- [O] h=408  ONBOARDING → ITSM  `task.workplace_setup_required`  payload=onboarding_tasks
- [O] h=6  ONBOARDING → IWMS  `task.workplace_setup_required`  payload=onboarding_tasks
- [O] h=8  ONBOARDING → LMS  `task.compliance_training_required`  payload=onboarding_tasks

### 14095 L3 — Document trade (5)
- [S] h=825  ECM → AUDIT  `document.retention_expired`  payload=records_retention_policies
- [S] h=822  ECM → DLP  `document.classified`  payload=document_classifications
- [S] h=827  ECM → GRC  `document.classified`  payload=document_classifications
- [S] h=839  ECM → IGA  `document.classified`  payload=content_documents
- [S] h=826  ECM → KMS  `document.version_published`  payload=document_versions

### 10505 L4 — Administer benefit enrollment (5)
- [S] h=1098  BEN-ADMIN → BEN-ADMIN  `enrollment.changed`  payload=carrier_feeds
- [S] h=1100  BEN-ADMIN → BEN-ADMIN  `enrollment.changed`  payload=benefit_enrollments
- [S] h=109  BEN-ADMIN → FIN  `enrollment.changed`  payload=payroll_journal_entries
- [S] h=108  BEN-ADMIN → PAYROLL  `enrollment.changed`  payload=benefit_enrollments
- [S] h=188  BEN-ADMIN → PAYROLL  `enrollment.changed`  payload=payroll_journal_entries

### 10733 L2 — Process accounts payable and expense reimbursements (4)
- [S] h=139  EXPENSE → PSA  `expense.approved`  payload=expense_reports
- [S] h=101  PAYROLL → EXPENSE  `expense.reimbursable`  payload=pay_slips
- [S] h=1128  PSA → FIN  `expense.approved`  payload=expense_reports
- [S] h=1133  PSA → PSA  `expense.approved`  payload=expense_reports

### 11779 L3 — Develop and manage sales proposals, bids, and quotes (4)
- [A] h=62  CPQ → CLM  `quote.accepted`  payload=legal_contracts
- [A] h=482  CPQ → CLM  `contract_draft.generated`  payload=contract_drafts
- [A] h=1014  CPQ → CLM  `quote_discount.approved`  payload=quote_discounts
- [S] h=204  CPQ → CRM  `quote.expired`  payload=crm_opportunities

### 10280 L3 — Manage suppliers (4)
- [O] h=128  SUP-LIFE → AP-AUTO  `supplier.bank_changed`  payload=suppliers
- [O] h=213  SUP-LIFE → FIN  `supplier.onboarded`  payload=supplier_onboardings
- [O] h=214  SUP-LIFE → GRC  `supplier.risk_elevated`  payload=supplier_scorecards
- [O] h=127  SUP-LIFE → S2P  `supplier.approved`  payload=suppliers

### 21698 L3 — Manage employee requisitions (4)
- [S] h=399  ATS → HCM  `requisition.filled`  payload=job_requisitions
- [S] h=23  ATS → PA  `requisition.filled`  payload=people_kpis
- [S] h=12  ATS → SWP  `requisition.filled`  payload=position_demand_forecasts
- [S] h=400  ATS → SWP  `requisition.filled`  payload=job_requisitions

### 10440 L3 — Recruit/Source candidates (4)
- [S] h=395  ATS → BEN-ADMIN  `candidate.hired`  payload=candidates
- [S] h=17  ATS → HCM  `candidate.hired`  payload=employees
- [S] h=393  ATS → HCM  `candidate.hired`  payload=candidates
- [S] h=394  ATS → ONBOARDING  `candidate.hired`  payload=candidates

### 16944 L3 — Conduct employee engagement surveys (4)
- [S] h=1107  PA → EMP-EXP  `engagement.declining`  payload=engagement_surveys
- [S] h=1109  PA → HRSD  `engagement.declining`  payload=engagement_surveys
- [S] h=1114  PA → PA  `engagement_survey.closed`  payload=engagement_surveys
- [S] h=1108  PA → TALENT-MGMT  `engagement.declining`  payload=engagement_surveys

### 20740 L4 — Review and monitor application security controls (4)
- [S] h=236  APM → CMDB  `application.onboarded`  payload=enterprise_applications
- [S] h=237  APM → CMDB  `application.lifecycle_state_changed`  payload=enterprise_applications
- [S] h=235  APM → SAM  `application.onboarded`  payload=enterprise_applications
- [S] h=238  APM → SAM  `application.lifecycle_state_changed`  payload=enterprise_applications

### 10862 L4 — Process and distribute payments (4)
- [O] h=193  AP-AUTO → CSM  `payment.exception`  payload=payment_runs
- [O] h=192  AP-AUTO → FIN  `payment.exception`  payload=payment_runs
- [O] h=329  B2C-COMM → CRM  `payment.declined`  payload=payment_transactions
- [O] h=72  SUB-MGMT → CSM  `payment.failed`  payload=customer_cases

### 10192 L5 — Close the sale (4)
- [A] h=297  RE-BROKERAGE → RE-CRE  `real_estate_transaction.closed`  payload=real_estate_transactions
- [A] h=861  RE-BROKERAGE → RE-CRE  `listing.sold`  payload=real_estate_listings
- [A] h=862  RE-BROKERAGE → RE-INVEST  `listing.sold`  payload=real_estate_listings
- [A] h=296  RE-BROKERAGE → RE-PROP-MGMT  `real_estate_transaction.closed`  payload=real_estate_transactions

### 10148 L3 — Establish goals, objectives, and measures for products/services by channel/segment (3)
- [S] h=80  CDP → B2C-COMM  `segment.activated`  payload=customers
- [S] h=478  CDP → LOYALTY  `segment.activated`  payload=audience_segments
- [S] h=78  CDP → MA  `segment.activated`  payload=audience_segments

### 10222 L3 — Manage demand for products (3)
- [A] h=215  CLM → S2P  `legal_contract.expired`  payload=legal_contracts
- [A] h=46  CLM → SMP  `legal_contract.renewed`  payload=saas_subscriptions
- [A] h=44  SMP → CLM  `renewal.30_day_warning`  payload=legal_contracts

### 11043 L3 — Report audit findings (3)
- [S] h=254  AUDIT → GRC  `finding.created`  payload=audit_findings
- [S] h=258  AUDIT → TPRM  `finding.remediated`  payload=audit_findings
- [S] h=357  FSQM → AUDIT  `audit_finding.created`  payload=audit_findings

### 19954 L4 — Establish baseline metrics (3)
- [S] h=220  DCG → METRICS-LAYER  `metric.deprecated`  payload=metric_definitions
- [S] h=218  METRICS-LAYER → BI  `metric.certified`  payload=metric_definitions
- [S] h=219  METRICS-LAYER → DATA-AI-PLAT  `metric.certified`  payload=metric_definitions

### 10083 L4 — Assign resources to product/service project (3)
- [S] h=1129  PSA → CRM  `service_project.completed`  payload=service_projects
- [S] h=1135  PSA → PSA  `service_project.staffing_required`  payload=service_projects
- [S] h=132  PSA → S2P  `service_project.staffing_required`  payload=purchase_requisitions

### 10295 L4 — Create/Distribute purchase orders (3)
- [S] h=581  S2P → AP-AUTO  `purchase_order.issued`  payload=purchase_orders
- [S] h=583  S2P → AP-AUTO  `purchase_order.changed`  payload=purchase_orders
- [S] h=582  S2P → FIN  `purchase_order.issued`  payload=purchase_orders

### 20903 L4 — Triage IT service delivery incidents (3)
- [A] h=57  AIOPS → ITSM  `correlation.identified`  payload=service_incidents
- [A] h=28  ITOM → ITSM  `monitoring_event.alert_triggered`  payload=service_incidents
- [A] h=55  OBS → ITSM  `slo.breached`  payload=service_incidents

### 10773 L4 — Prepare periodic financial forecasts (3)
- [S] h=199  EPM → AUDIT  `financial_forecast.refreshed`  payload=financial_forecasts
- [S] h=27  EPM → SWP  `financial_forecast.refreshed`  payload=workforce_plans
- [A] h=1020  PSA → CLM  `project_billing_milestone.reached`  payload=project_billing_milestones

### 19965 L5 — Create customer journey maps (3)
- [S] h=480  CDP → B2C-COMM  `customer_journey.stage_entered`  payload=customer_journeys
- [S] h=409  ONBOARDING → EMP-EXP  `journey.day_one_reached`  payload=onboarding_journeys
- [S] h=7  ONBOARDING → PAYROLL  `journey.day_one_reached`  payload=onboarding_journeys

### 20085 L1 — Manage Customer Service (2)
- [S] h=66  B2C-COMM → CRM  `customer.signed_up`  payload=customers
- [S] h=233  CSM → SUB-MGMT  `customer.churn_confirmed`  payload=customers

### 17058 L1 — Manage Financial Resources (2)
- [S] h=51  CMDB → ITSM  `ci.unauthorized_change_detected`  payload=service_incidents
- [S] h=48  DISCOVERY → CMDB  `ci.discovered`  payload=configuration_items

### 19207 L1 — Acquire, Construct, and Manage Assets (2)
- [S] h=150  HAM → RMM  `asset.retired`  payload=rmm_agents
- [S] h=633  ITAM → HAM  `asset.retired_for_disposal`  payload=asset_lifecycle_events

### 10016 L2 — Develop and measure strategic initiatives (2)
- [S] h=245  SPM → EPM  `initiative.completed`  payload=strategic_initiatives
- [S] h=241  SPM → SWP  `initiative.kickoff`  payload=strategic_initiatives

### 20110 L2 — Manage product recalls and regulatory audits (2)
- [S] h=225  CCAAS → CSM  `call.escalated`  payload=support_sessions
- [S] h=82  SALES-ENG → CRM  `call.completed`  payload=sales_activities

### 10728 L2 — Perform planning and management accounting (2)
- [S] h=527  CRM → CPQ  `account.tier_changed`  payload=customers
- [S] h=203  CRM → SALES-PERF  `account.tier_changed`  payload=customers

### 10729 L2 — Perform revenue accounting (2)
- [S] h=131  PSA → FIN  `revenue.recognised`  payload=revenue_recognition_records
- [S] h=197  SUB-MGMT → FIN  `revenue.recognised`  payload=revenue_recognition_records

### 10735 L2 — Manage internal controls (2)
- [S] h=840  GRC → AUDIT  `control.failed`  payload=compliance_controls
- [S] h=248  GRC → ITSM  `control.failed`  payload=service_incidents

### 10018 L3 — Survey market and determine customer needs and wants (2)
- [S] h=442  EMP-EXP → HCM  `survey.cycle_closed`  payload=engagement_drivers
- [S] h=115  EMP-EXP → PA  `survey.cycle_closed`  payload=engagement_drivers

### 10183 L3 — Manage customers and accounts (2)
- [A] h=343  AGENCY-MGMT → CLM  `estimate.approved`  payload=legal_contracts
- [A] h=63  CLM → SUB-MGMT  `legal_contract.signed`  payload=customer_subscriptions

### 10277 L3 — Provide sourcing governance (2)
- [A] h=40  S2P → CLM  `sourcing.contract_drafted`  payload=legal_contracts
- [A] h=602  S2P → CLM  `sourcing_event.awarded`  payload=sourcing_events

### 20743 L3 — Conduct and analyze IT compliance assessments (2)
- [S] h=253  GRC → BCM  `assessment.completed`  payload=compliance_risks
- [S] h=252  GRC → OP-RES  `assessment.completed`  payload=risk_assessments

### 10760 L3 — Manage in-house bank accounts (2)
- [S] h=537  FIN → AP-AUTO  `bank_account.added`  payload=bank_accounts
- [S] h=597  FIN → AP-AUTO  `bank_account.statement_received`  payload=bank_accounts

### 10941 L3 — Develop property strategy and long term vision (2)
- [S] h=856  REAL-EST → RE-CRE  `property.listed`  payload=real_estate_properties
- [S] h=857  REAL-EST → RE-INVEST  `property.updated`  payload=real_estate_properties

### 11750 L4 — Review and approve data access requests (2)
- [S] h=264  DCG → DLP  `data_access_request.approved`  payload=data_access_policies
- [S] h=263  DCG → IGA  `data_access_request.approved`  payload=data_access_policies

### 10175 L4 — Analyze customer attrition and retention rates (2)
- [S] h=451  PA → HCM  `attrition.forecast_updated`  payload=workforce_plans
- [S] h=13  PA → SWP  `attrition.forecast_updated`  payload=workforce_plans

### 10197 L4 — Determine fulfillment process (2)
- [S] h=503  B2C-COMM → FIN  `fulfillment.delivered`  payload=fulfillments
- [S] h=505  B2C-COMM → LOYALTY  `fulfillment.delivered`  payload=fulfillments

### 12046 L4 — Perform root cause analysis (2)
- [S] h=58  AIOPS → ITSM  `root_cause.identified`  payload=service_problems
- [S] h=603  AIOPS → ITSM  `root_cause_analysis.published`  payload=service_incidents

### 10511 L4 — Review compensation plan (2)
- [S] h=1125  COMP-MGMT → HCM  `compensation_plan.published`  payload=compensation_plans
- [S] h=1126  COMP-MGMT → PAYROLL  `compensation_plan.published`  payload=compensation_plans

### 20829 L4 — Define IT change/release standards (2)
- [A] h=30  ITSM → CMDB  `service_change.completed`  payload=service_changes
- [A] h=142  RMM → ITSM  `patch_job.scheduled`  payload=service_changes

### 20893 L4 — Plan and budget IT license usage volumes (2)
- [S] h=925  PS-LIC → FIN  `license.issued`  payload=license_records
- [S] h=35  SAM → ITSM  `license.expiry_warning`  payload=service_requests

### 20136 L4 — Perform variance analysis against forecasts and budgets (2)
- [S] h=564  EPM → AUDIT  `variance_analysis.material_variance`  payload=variance_analyses
- [S] h=563  EPM → FIN  `variance_analysis.material_variance`  payload=variance_analyses

### 10931 L4 — Prepare tax returns (2)
- [S] h=340  ACCT-PRACT-MGMT → AP-AUTO  `tax_return.filed`  payload=supplier_invoices
- [S] h=338  ACCT-PRACT-MGMT → GRC  `tax_return.filed`  payload=tax_returns

### 10004 L1 — Market and Sell Products and Services (1)
- [A] h=469  CRM → CLM  `crm_opportunity.closed_won`  payload=crm_opportunities

### 16437 L1 — Manage Enterprise Risk, Compliance, Remediation, and Resiliency (1)
- [A] h=521  CLM → GRC  `contract_obligation.breached`  payload=contract_obligations

### 10012 L1 — Manage External Relationships (1)
- [S] h=49  DISCOVERY → CMDB  `relationship.discovered`  payload=ci_relationships

### 21634 L2 — Manage and Operate Service Delivery System (1)
- [A] h=342  CLM → AGENCY-MGMT  `legal_contract.signed`  payload=agency_jobs

### 20866 L2 — Create and manage support services/solutions (1)
- [S] h=42  S2P → SMP  `po.saas_subscription_created`  payload=saas_subscriptions

### 10737 L2 — Manage international funds/consolidation (1)
- [S] h=1040  FUND-ADMIN → INV-CRM  `fund.final_close`  payload=lp_prospects

### 11013 L2 — Manage legal and ethical issues (1)
- [A] h=332  LEGAL-PRACT-MGMT → CLM  `engagement_letter.signed`  payload=engagement_letters

### 10185 L3 — Manage sales orders (1)
- [O] h=67  B2C-COMM → SUB-MGMT  `order.subscription_purchase`  payload=customer_subscriptions

### 10224 L3 — Create and manage master production schedule (1)
- [S] h=953  MFG-OPS → EAM  `production_schedule.published`  payload=production_schedules

### 10279 L3 — Order materials and services (1)
- [A] h=519  CLM → SUB-MGMT  `legal_contract.signed`  payload=legal_contracts

### 10218 L3 — Service products (1)
- [A] h=41  CLM → S2P  `legal_contract.signed`  payload=purchase_orders

### 20114 L3 — Submit regulatory reports (1)
- [A] h=311  RE-BROKERAGE → GRC  `real_estate_transaction.closed`  payload=disclosure_documents

### 10401 L3 — Measure customer satisfaction with customer problems, requests, and inquiries handling (1)
- [A] h=522  CLM → CRM  `renewal.30_day_warning`  payload=legal_contracts

### 20756 L3 — Manage IT user identity and authorization (1)
- [A] h=631  ITSM → IGA  `service_catalog_item.published`  payload=service_catalog_items

### 20921 L3 — Operate IT user support (1)
- [A] h=162  REMOTE-ACCESS → ITSM  `support_session.completed`  payload=service_incidents

### 10741 L3 — Evaluate and manage financial performance (1)
- [A] h=339  ACCT-PRACT-MGMT → CLM  `engagement_letter.signed`  payload=engagement_letters

### 10744 L3 — Process accounts receivable (AR) (1)
- [A] h=216  CLM → AP-AUTO  `legal_contract.amended`  payload=legal_contracts

### 10752 L3 — Perform capital project accounting (1)
- [S] h=294  REAL-EST → EAM  `capital_project.completed`  payload=capital_projects

### 20929 L3 — Manage corporate credit cards (1)
- [S] h=38  EXPENSE → SMP  `card.saas_charge_detected`  payload=shadow_it_apps

### 11201 L3 — Create remediation plans (1)
- [S] h=841  GRC → ITSM  `remediation_plan.created`  payload=service_incidents

### 17492 L3 — Manage non-conformance (1)
- [S] h=183  PROC-MIN → BPA  `conformance.deviation_detected`  payload=business_process_models

### 16817 L4 — Provide warranty-related recommendations (1)
- [S] h=256  AUDIT → EPM  `recommendation.accepted`  payload=audit_recommendations

### 10094 L4 — Conduct customer tests and interviews (1)
- [S] h=1064  ATS → ATS  `interview.completed`  payload=job_applications

### 19640 L4 — Conduct brand level social sentiment analysis (1)
- [S] h=226  CCAAS → CSM  `sentiment.negative`  payload=support_sessions

### 16575 L4 — Monitor and report events influencing factors (1)
- [S] h=53  ITOM → AIOPS  `events.burst_detected`  payload=event_correlations

### 18925 L4 — Acquire members to customer loyalty program (1)
- [S] h=232  LOYALTY → MA  `member.lapsed`  payload=loyalty_members

### 18115 L4 — Validate and qualify leads/opportunities (1)
- [A] h=308  RE-BROKERAGE → CRM  `real_estate_listing.qualified`  payload=crm_leads

### 10209 L4 — Determine sales resource allocation (1)
- [S] h=242  SPM → SWP  `resource_allocation.committed`  payload=resource_allocations

### 10258 L4 — Calculate and optimize destination dispatch plan (1)
- [S] h=230  FSM → CSM  `dispatch.failed`  payload=dispatch_records

### 10285 L4 — Analyze organization’s spend profile (1)
- [S] h=68  CDP → CRM  `profile.lifecycle_changed`  payload=customers

### 10308 L4 — Schedule production orders and create lots (1)
- [S] h=950  MFG-OPS → FIN  `production_order.completed`  payload=production_orders

### 10315 L4 — Plan for preventive maintenance (1)
- [S] h=312  TELEMATICS → FLEET-MAINT  `preventive_maintenance.due`  payload=preventive_maintenance_schedules

### 10395 L4 — Resolve customer problems, requests, and inquiries (1)
- [A] h=517  CLM → CPQ  `contract_template.published`  payload=contract_templates

### 10426 L4 — Develop succession plan (1)
- [S] h=437  TALENT-MGMT → HCM  `succession_plan.published`  payload=succession_plans

### 10455 L4 — Manage recruitment vendors (1)
- [S] h=170  S2P → SPEND-MGMT  `vendor.added`  payload=suppliers

### 10515 L4 — Manage leave of absence (1)
- [S] h=135  WFM → HCM  `absence.approved`  payload=absence_requests

### 20689 L4 — Manage IT projects and services interdependencies (1)
- [A] h=217  ESIGN → CLM  `envelope.completed`  payload=envelopes

### 20722 L4 — Evaluate enterprise regulatory and compliance obligations (1)
- [S] h=251  GRC → AUDIT  `obligation.overdue`  payload=compliance_obligations

### 20847 L4 — Document IT change/release outcome (1)
- [A] h=143  RMM → ITSM  `patch_job.completed`  payload=service_changes

### 20849 L4 — Confirm hardware/software operational status (1)
- [S] h=33  DISCOVERY → SAM  `software.discovered`  payload=software_installations

### 20898 L4 — Maintain service support knowledge repository (1)
- [A] h=630  ITSM → KMS  `knowledge_article.published`  payload=knowledge_articles

### 10778 L4 — Determine key cost drivers (1)
- [A] h=309  RE-CRE → CLM  `commercial_lease.executed`  payload=commercial_leases

### 10796 L4 — Transmit billing data to customers (1)
- [A] h=518  CLM → FIN  `legal_contract.signed`  payload=legal_contracts

### 10823 L4 — Post and reconcile intercompany transactions (1)
- [S] h=541  FIN → AUDIT  `intercompany.mismatch_detected`  payload=intercompany_transactions

### 10833 L4 — Calculate and record depreciation expense (1)
- [S] h=540  FIN → EPM  `depreciation.posted`  payload=asset_depreciation_schedules

### 12878 L4 — Plan and manage meetings (1)
- [S] h=206  SALES-ENG → CRM  `meeting.no_show`  payload=sales_activities

### 16413 L4 — Develop project plans (1)
- [A] h=138  CLM → PSA  `legal_contract.signed`  payload=legal_contracts

