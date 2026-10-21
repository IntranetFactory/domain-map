# Cluster D brief — Vendor / Contract / Customer

**Domains in scope (4):** CSM, CLM, VMS, SUP-LIFE

**Your job:** for EACH of the 4 domains, author one markdown section following the OUTPUT TEMPLATE below. Write the full set to `.tmp_deploy/cluster_D_draft.md`. Do NOT call semantius or any database tool — drafts only. The draft will be reviewed by the user before any load happens.

---

## Domain details

### CSM — Customer Service Management

**Description:** Case management, omnichannel engagement, and self-service for external customer support.

**Business logic:** Skills-based routing and next-best-action recommendations are the only non-CRUD layer; both are increasingly handled by ML models invoked from declarative rules.

**Data objects (8):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `csat_responses` | CSAT Response | CSAT Responses |
| master | `customer_cases` | Customer Case | Customer Cases |
| master | `customer_entitlements` | Customer Entitlement | Customer Entitlements |
| master | `customers` | Customer | Customers |
| contributor | `customer_events` | Customer Event | Customer Events |
| contributor | `knowledge_articles` | Knowledge Article | Knowledge Articles |
| contributor | `legal_contracts` | Contract | Contracts |
| consumer | `customer_subscriptions` | Customer Subscription | Customer Subscriptions |

### CLM — Contract Lifecycle Management

**Description:** Authoring, negotiation, execution, and post-signature management of contracts.

**Business logic:** Clause-comparison and risk-detection ML during negotiation; the rest is repository, redlining workflow, and approvals.

**Data objects (8):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `contract_clauses` | Contract Clause | Contract Clauses |
| master | `contract_obligations` | Contract Obligation | Contract Obligations |
| master | `contract_templates` | Contract Template | Contract Templates |
| master | `legal_contracts` | Contract | Contracts |
| master | `signature_records` | Signature Record | Signature Records |
| contributor | `saas_subscriptions` | SaaS Subscription | SaaS Subscriptions |
| contributor | `software_licenses` | Software License | Software Licenses |
| consumer | `sourcing_events` | Sourcing Event | Sourcing Events |

### VMS — Vendor Management System

**Description:** Contingent-workforce sourcing, staffing-supplier management, rate cards, contingent timesheets, and worker-classification compliance. Used by procurement and HR jointly.

**Data objects (6):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `contingent_invoices` | Contingent Invoice | Contingent Invoices |
| master | `contingent_timesheets` | Contingent Timesheet | Contingent Timesheets |
| master | `contingent_workers` | Contingent Worker | Contingent Workers |
| master | `pm_work_orders` | Preventive Maintenance Work Order | Preventive Maintenance Work Orders |
| master | `rate_cards` | Rate Card | Rate Cards |
| master | `staffing_suppliers` | Staffing Supplier | Staffing Suppliers |

### SUP-LIFE — Supplier Lifecycle Management

**Description:** Supplier onboarding, master data, performance, and relationship management.

**Business logic:** Supplier scorecard math (KPI roll-ups, weighted ratings) — a calc layer over CRUD records.

**Data objects (6):**

| role | data_object_name | singular | plural |
|---|---|---|---|
| master | `supplier_certifications` | Supplier Certification | Supplier Certifications |
| master | `supplier_onboardings` | Supplier Onboarding | Supplier Onboardings |
| master | `supplier_qualifications` | Supplier Qualification | Supplier Qualifications |
| master | `supplier_risk_assessments` | Supplier Risk Assessment | Supplier Risk Assessments |
| master | `supplier_scorecards` | Supplier Scorecard | Supplier Scorecards |
| master | `suppliers` | Supplier | Suppliers |

---

## Cross-domain handoffs touching this cluster (109)

Convert each row to a cross-domain relationship edge (section 4 of each domain's draft) where there is a clean payload→target mapping. The payload's data_object is the **from** side; pick a natural recipient in the target_domain as the **to** side.

| source_domain | payload (data_object) | trigger_event | target_domain | integration_pattern | friction | description |
|---|---|---|---|---|---|---|
| ESG | `supplier_esg_assessments` | `supplier_esg_assessment.score_updated` | SUP-LIFE | api_call | medium | Updated ESG score → SUP-LIFE supplier_qualifications field; tier reassessment. |
| CLM | `contract_obligations` | `contract_obligation.breached` | GRC | manual_handoff | high | Obligation breach creates a GRC issue. Often handled manually; structured breach data is rare. |
| CLM | `purchase_orders` | `legal_contract.signed` | S2P | api_call | low | Signed contract in CLM triggers PO creation in S2P. Low friction when the CLM and S2P stack are integrated (Coupa CLM ↔ Coupa P2P), higher when separate. |
| CLM | `legal_contracts` | `legal_contract.expired` | S2P | batch_sync | medium | Expired contracts trigger procurement renewal-decision workflow. Failure modes: auto-renewal clauses missed; silent expiry of long-tail contracts. |
| CLM | `legal_contracts` | `legal_contract.amended` | AP-AUTO | api_call | medium | Contract amendments propagate to AP-AUTO: updated payment terms, discount schedule, GL coding. Failure modes: retroactive amendments require recalculating already-paid invoices. |
| CLM | `contract_obligations` | `contract_obligation.due` | CSM | event_stream | medium | Upcoming SLA or deliverable obligation alerted to CSM. |
| CLM | `legal_contracts` | `legal_contract.signed` | ERP-FIN | api_call | medium | Signed contract feeds ERP-FIN payment terms and rev-rec rules. Friction in extracting structured terms from contract text. |
| CLM | `legal_contracts` | `legal_contract.signed` | PSA | api_call | medium | Signed SOW seeds PSA project scope, billing terms, and milestone schedule. Deviations between contract terms and operational project structure require manual reconciliation. |
| CLM | `legal_contracts` | `renewal.30_day_warning` | CRM | event_stream | low | 30-day renewal warning surfaces in CRM for account-rep action. |
| CLM | `contract_templates` | `contract_template.published` | CPQ | api_call | medium | New approved template available to CPQ for contract-draft generation. |
| CLM | `saas_subscriptions` | `legal_contract.renewed` | SMP | api_call | low | Renewed SaaS contract in CLM updates the corresponding subscription in SMP with new term, new seat count, new pricing. |
| CLM | `customer_subscriptions` | `legal_contract.signed` | SUB-MGMT | api_call | medium | Signed contract creates the customer subscription in SUB-MGMT: plan, term, MRR/ARR, billing cadence, seat count, start date. The 'order-to-active' moment. |
| CLM | `legal_contracts` | `legal_contract.signed` | SUB-MGMT | api_call | medium | Signed contract triggers SUB-MGMT to activate the subscription record. |
| CLM | `agency_jobs` | `legal_contract.signed` | AGENCY-MGMT | api_call | medium | Signed SOW or MSA from CLM seeds billing rules, rate card, scope envelope, and SLA terms onto the agency_job. Subsequent change orders also flow this way. |
| S2P | `legal_contracts` | `sourcing.contract_drafted` | CLM | api_call | medium | Sourcing decision in S2P hands off to CLM to author the contract. Friction sits in clause selection, redline coordination with the counterparty, and the legal-review loop with LSD. |
| S2P | `sourcing_events` | `sourcing_event.awarded` | CLM | event_stream | low | Award triggers contract drafting in CLM with the chosen supplier. |
| S2P | `sourcing_events` | `sourcing_event.awarded` | SUP-LIFE | event_stream | low | Award updates supplier-tier and engagement records. |
| S2P | `goods_receipts` | `goods_receipt.quantity_variance` | SUP-LIFE | event_stream | medium | Quantity variances feed supplier scorecards. |
| SUP-LIFE | `supplier_scorecards` | `supplier.risk_elevated` | GRC | api_call | high | Risk-score elevation triggers GRC engagement: enhanced due diligence, mitigation plan, exit strategy if warranted. Failure modes: false-positive risk signals from third-party data; |
| SUP-LIFE | `supplier_risk_assessments` | `supplier_risk_assessment.elevated` | GRC | event_stream | high | Elevated supplier risk opens a GRC issue and may trigger remediation. |
| SUP-LIFE | `supplier_risk_assessments` | `supplier_risk_assessment.completed` | AUDIT | batch_sync | medium | AUDIT samples supplier risk assessments as part of third-party-risk testing. |
| SUP-LIFE | `suppliers` | `supplier.approved` | S2P | event_stream | low | Supplier onboarding completion makes the supplier eligible for sourcing events and purchase orders. |
| SUP-LIFE | `supplier_qualifications` | `supplier_qualification.approved` | S2P | event_stream | low | Qualified suppliers become eligible for sourcing events. |
| SUP-LIFE | `supplier_qualifications` | `supplier_qualification.expired` | S2P | event_stream | high | Expired qualifications block new POs until re-qualification. |
| SUP-LIFE | `suppliers` | `supplier.bank_changed` | AP-AUTO | api_call | high | Supplier bank-account changes carry significant fraud risk; identity-reconciliation pattern. Strong vendor-master controls and out-of-band verification gate the propagation to AP-A |
| SUP-LIFE | `supplier_qualifications` | `supplier_qualification.approved` | AP-AUTO | event_stream | low | AP-AUTO unblocks payments once qualification is complete. |
| SUP-LIFE | `supplier_qualifications` | `supplier_qualification.expired` | AP-AUTO | event_stream | high | Expired qualifications hold supplier payments pending re-qualification. |
| SUP-LIFE | `supplier_onboardings` | `supplier.onboarded` | ERP-FIN | api_call | medium | Newly-onboarded supplier triggers vendor-master creation in ERP-FIN: AP setup, payment-method record, tax-form repository. Failure modes: supplier-identity duplication when the sam |
| AP-AUTO | `invoice_matches` | `invoice_match.exception_raised` | SUP-LIFE | api_call | medium | Exceptions update supplier scorecard signals. |
| AP-AUTO | `payment_runs` | `payment.exception` | CSM | api_call | medium | Customer-facing refund payment failures need CSM awareness so the customer can be contacted before they discover the missing refund themselves. |
| CSM | `customers` | `case.critical_health_drop` | CRM | api_call | high | Cluster of critical cases or sustained low CSAT triggers an account-health-drop signal back to CRM, surfacing as a churn-risk flag on the account. High friction because the thresho |
| CSM | `customers` | `health_score.declined` | CRM | event_stream | medium | Declining health score surfaces churn risk to CRM for sales-rep awareness during renewal. |
| CSM | `customer_cases` | `case.created` | CRM | api_call | low | Customer case creation logs an activity on the CRM account. Native CSM-CRM integration on shared platforms. |
| CSM | `customers` | `subscription.expansion_requested` | CRM | manual_handoff | medium | CSM-identified expansion creates a CRM opportunity. Often a manual handoff with poor close-the-loop visibility. |
| CSM | `customer_events` | `case.created` | CDP | event_stream | medium | Case lifecycle events (created, escalated, resolved, CSAT received) flow from CSM to CDP so the unified profile reflects support interactions. Friction is medium — case identifiers |
| CSM | `dunning_events` | `case.churn_risk_detected` | SUB-MGMT | api_call | high | CSM-side churn-risk detection (case patterns, low CSAT, low product usage) feeds back to SUB-MGMT to influence dunning treatment, retention offers, and renewal forecasting. High fr |
| CSM | `customers` | `health_score.declined` | SUB-MGMT | api_call | high | Declining customer health score flags renewal risk; SUB-MGMT may need to adjust dunning lenience or surface for retention. Failure modes: multiple health-score variants disagree. |
| CSM | `customers` | `customer.churn_confirmed` | SUB-MGMT | api_call | high | Confirmed churn triggers SUB-MGMT subscription cancellation and revenue-impact recognition. Failure modes: churn confirmed but contract-end-date not aligned; refund logic edge case |
| CSM | `customers` | `subscription.expansion_requested` | SUB-MGMT | api_call | medium | CSM-identified expansion needs SUB-MGMT proposal generation and CRM opportunity creation. Failure modes: duplicate opportunities when CSM and sales both file. |
| CSM | `customer_entitlements` | `customer_entitlement.depleted` | SUB-MGMT | event_stream | medium | Depleted entitlement triggers overage-billing review in SUB-MGMT. |
| FSM | `field_visits` | `work_order.completed` | CSM | api_call | medium | Completed field visits trigger CSM customer-satisfaction outreach and billing kickoff. Failure modes: technician sign-off lag; partial completion edge cases. |
| FSM | `dispatch_records` | `dispatch.failed` | CSM | api_call | high | Failed dispatch must reach CSM for customer rescheduling comm. Failure modes: failure detection lag; rescheduling SLA breached before CSM is informed. |
| FSM | `service_work_orders` | `service_work_order.completed` | CSM | event_stream | low | Field service completion triggers customer satisfaction survey. |
| OMS | `order_allocations` | `order_allocation.failed` | CSM | event_stream | high | Failed allocations are a customer-facing exception; CSM must proactively engage to offer alternatives or refund. Typically high friction because OMS and CSM ticketing live in diffe |
| OMS | `return_authorizations` | `return_authorization.issued` | CSM | event_stream | low | Returns drive support case volume; CSM links the RMA to the customer record to track resolution. |
| OMS | `sourcing_decisions` | `sourcing_decision.overridden` | CSM | event_stream | medium | Manual overrides usually correlate with exception cases; CSM gets context to handle customer questions and slipped ETAs. |
| KMS | `knowledge_base_articles` | `knowledge_base_article.published` | CSM | event_stream | low | Customer service consumes new KB article in agent-assist surfaces. |
| CONV-AI | `intent_definitions` | `intent_definition.low_confidence_burst` | CSM | event_stream | medium | Spike of low-confidence intents may indicate emerging support topic; CSM/KMS investigate. |
| TELCO-BSS | `telco_subscriptions` | `telco_subscription.suspended` | CSM | api_call | high | Subscription suspension triggers urgent CSM customer outreach (payment, retention). |
| TELCO-BSS | `telco_service_orders` | `telco_service_order.completed` | CSM | api_call | low | Completed service order triggers CSM welcome / activation-confirmation motion. |
| BANK-OPS | `account_openings` | `account_opening.completed` | CSM | api_call | low | New account triggers welcome motion in customer service. |
| BANK-OPS | `banking_cases` | `banking_case.opened` | CSM | api_call | medium | Operational banking case visible to CSM for customer-facing communications. |
| INS-CLAIMS | `insurance_claims` | `insurance_claim.fnol_received` | CSM | api_call | medium | FNOL receipt triggers CSM outreach (claim acknowledgment, status updates). |
| INS-CLAIMS | `insurance_claims` | `insurance_claim.closed` | CSM | api_call | low | Claim closure triggers customer-satisfaction surveys and CSM follow-up. |
| INS-CLAIMS | `insurance_policies` | `insurance_policy.cancelled` | CSM | api_call | medium | Policy cancellation triggers retention/win-back motion in CSM. |
| HC-PATIENT | `patient_appointments` | `patient_appointment.no_show` | CSM | api_call | medium | Patient no-show triggers CSM outreach for rescheduling and retention. |
| HC-PATIENT | `patient_referrals` | `patient_referral.created` | CSM | api_call | medium | Referrals require patient-facing communication and tracking; surfaced to CSM. |
| PS-LIC | `permit_inspections` | `permit_inspection.failed` | CSM | api_call | medium | Failed inspection triggers CSM constituent outreach and reinspection scheduling. |
| PS-LIC | `license_renewals` | `license_renewal.due` | CSM | batch_sync | low | Renewal-window openings trigger CSM customer-communication campaigns. |
| UTIL-OPS | `outage_events` | `outage_event.declared` | CSM | api_call | high | Declared outage triggers CSM/CCAAS mass-notification, IVR scripts and proactive customer outreach. |
| VMS | `contingent_invoices` | `pm_work_order.invoiced` | S2P | event_stream | medium | Approved contingent_timesheets × rate_cards produce contingent_invoices that flow into S2P / AP-AUTO for three-way match and payment to the staffing supplier. |
| VMS | `staffing_suppliers` | `staffing_supplier.activated` | SUP-LIFE | api_call | low | Activated staffing suppliers reconcile with the supplier master. |
| VMS | `contingent_invoices` | `contingent_invoice.received` | AP-AUTO | event_stream | low | Contingent invoices enter the AP three-way match queue. |
| VMS | `contingent_workers` | `worker.tenure_threshold` | HCM | manual_handoff | high | Contingent worker crossing co-employment-risk tenure threshold (typically 18-24 months) must be reclassified, off-boarded, or converted. Cross-vendor stack with same logical entity |
| VMS | `contingent_timesheets` | `contingent_timesheet.approved` | PAYROLL | batch_sync | medium | Where contingent workers are W-2 via the staffing supplier acting as employer of record, payroll cycle ingests approved hours. |
| VMS | `contingent_invoices` | `contingent_invoice.matched` | ERP-FIN | event_stream | low | Matched contingent invoices post liability to the GL. |
| VMS | `contingent_timesheets` | `contingent_timesheet.approved` | PSA | event_stream | low | Approved contingent hours hit project actuals in PSA. |
| PSA | `project_billing_milestones` | `project_billing_milestone.reached` | CLM | api_call | low | CLM updates contract-performance attributes when a milestone is met, supporting renewal valuation and SLA reporting. |
| CRM | `crm_opportunities` | `crm_opportunity.closed_won` | CLM | api_call | medium | Closed-won opportunity triggers contract drafting in CLM. Friction comes from quote-to-contract data mapping and legal redline cycles. |
| CRM | `customer_entitlements` | `crm_opportunity.closed_won` | CSM | api_call | low | Closed-won opportunity in CRM triggers entitlement provisioning in CSM ahead of (or in parallel to) subscription activation in SUB-MGMT. Important for fast onboarding of high-touch |
| CRM | `crm_opportunities` | `crm_opportunity.closed_won` | CSM | api_call | medium | Closed-won opportunity triggers CSM onboarding workflow. Account hand-off is a notorious friction point: sales-to-CS context loss is well documented. |
| B2C-COMM | `commerce_orders` | `commerce_order.completed` | CSM | api_call | medium | CSM creates post-purchase case for support + returns routing. |
| CDP | `customer_attributes` | `customer_attributes.refreshed` | CSM | batch_sync | medium | Refreshed CDP attributes feed CSM health-score inputs. Typically batch; latency limits real-time intervention. |
| CPQ | `legal_contracts` | `quote.accepted` | CLM | api_call | medium | Accepted quote hands off to CLM for contract authoring — pulls in clause language, populates the agreed terms, routes for signature. |
| CPQ | `contract_drafts` | `contract_draft.generated` | CLM | api_call | medium | CPQ-generated contract draft handed off to CLM for clause assembly and signature routing. Friction when CPQ's term language doesn't match approved CLM templates. |
| CPQ | `quote_discounts` | `quote_discount.approved` | CLM | api_call | medium | Approved discount terms must flow into the contract draft in CLM with the correct pricing, term length, and any concession clauses. |
| SMP | `legal_contracts` | `renewal.30_day_warning` | CLM | api_call | low | SMP's renewal-watch surfaces a 30-day expiry warning to CLM so the contract document workflow (amendment, renegotiation) can start in time. |
| MDM | `suppliers` | `supplier_golden_record.updated` | SUP-LIFE | api_call | high | Golden-record changes flow to SUP-LIFE for risk reassessment; approval workflows add latency. |
| MDM | `customers` | `customer_golden_record.created` | CSM | api_call | medium | Resolved golden ID published to service-view. |
| ESIGN | `envelopes` | `envelope.completed` | CLM | api_call | low | Completed e-signature envelopes flow into CLM as authoritative signature_records. Failure modes: identity-of-signer verification gaps; multi-party-signing edge cases. |
| SUB-MGMT | `customer_entitlements` | `subscription.activated` | CSM | api_call | medium | Subscription activation creates the matching customer_entitlements record in CSM: tier mapped to support level, named contacts seeded, SLA targets bound. Friction sits in mapping s |
| SUB-MGMT | `customer_cases` | `payment.failed` | CSM | api_call | medium | Payment failure opens a customer-success case in CSM for proactive intervention — distinct from automated dunning emails, this is the human-touch path for higher-value accounts. |
| SUB-MGMT | `dunning_events` | `dunning.escalation` | CSM | api_call | high | Dunning sequence escalation (retry count, days-overdue, severity tier) triggers CSM retention or collections handoff. Failure modes: CSM doesn't know when to stop dunning a strateg |
| SUB-MGMT | `customer_subscriptions` | `subscription.renewal_required` | CSM | batch_sync | medium | Subscriptions entering the renewal window (90 days from term-end by default) must surface in CSM for the renewal motion. Failure modes: auto-renew customers slip through CSM's view |
| SUB-MGMT | `customer_invoices` | `customer_invoice.past_due` | CSM | event_stream | medium | Past-due invoice triggers CSM outreach to prevent involuntary churn. |
| SUB-MGMT | `customer_subscriptions` | `subscription.cancelled` | CSM | event_stream | low | Cancellation event triggers CSM exit-interview and win-back workflows. |
| SUB-MGMT | `usage_records` | `usage_record.overage_detected` | CSM | event_stream | low | Overage prompts CSM tier-upgrade conversation. |
| CCAAS | `support_sessions` | `call.escalated` | CSM | event_stream | medium | Escalated calls trigger CSM case re-assignment to a specialist or supervisor. Failure modes: original agent's context lost in handoff. |
| CCAAS | `support_sessions` | `sentiment.negative` | CSM | api_call | high | Real-time negative sentiment triggers CSM triage for outreach. Failure modes: AI sentiment scoring is unreliable; false positives drown the queue. |
| PROD-MGMT | `beta_programs` | `beta_program.launched` | CSM | event_stream | low | CSM activates white-glove monitoring and direct comms with beta participants while the program is live. |
| PROD-MGMT | `customer_feedback_items` | `customer_feedback_item.linked_to_feature` | CSM | event_stream | medium | Closing the listening loop: CSM surfaces 'you asked, we're building it / shipped it' on the customer record. Often manual today which is why product-feedback platforms exist. |
| PROD-MGMT | `product_features` | `product_feature.deprecated` | CSM | event_stream | high | Deprecations require coordinated customer notification and migration plans; missed handoffs here lead to renewal-time blowups. |
| PROD-MGMT | `product_metrics` | `product_metric.threshold_breached` | CSM | event_stream | medium | Adoption / activation / churn-leading metrics dropping below threshold trigger CSM outreach plays for the affected accounts. |
| PROD-MGMT | `product_releases` | `product_release.rolled_back` | CSM | event_stream | high | Rollbacks need synchronised customer comms; CSM must override the original release messaging. Friction is high because retraction loops are rarely automated. |
| ACCT-PLAN | `customers` | `account_health.declined` | CSM | api_call | high | Strategic account planning flags declining health; CSM engages for retention. Failure modes: health score components disagree (usage, sentiment, billing) — CSM unclear what to addr |
| SMM | `social_mentions` | `social_mention.detected` | CSM | event_stream | high | Listening pipeline detects a brand/product mention with negative sentiment or high reach off-channel (Reddit thread, Twitter complaint without @mention, review-site post) and route |
| SMM | `social_messages` | `social_message.received` | CSM | api_call | high | Inbound social message (comment, DM, mention-reply) classified as a service issue (complaint, order question, technical problem) triggers case creation in CSM with the message payl |
| SMM | `social_mentions` | `social_listening_topic.alert` | CSM | event_stream | medium | Listening alert (complaint, crisis, sentiment shift) routed to CSM for triage. |
| MSP-PSA | `msp_tickets` | `msp_ticket.escalated` | CSM | event_stream | medium | Escalated MSP ticket routed to CSM for client-relationship management. |
| MSP-PSA | `msp_contracts` | `msp_contract.renewal_due` | CSM | event_stream | low | Approaching MSP contract renewal alerts CSM for client engagement. |
| RE-PROP-MGMT | `rental_units` | `rental_unit.vacant` | CSM | event_stream | medium | Tenant vacancy triggers CSM engagement for re-lease. |
| RE-CRE | `commercial_leases` | `commercial_lease.executed` | CLM | api_call | medium | Executed commercial lease document flows into CLM repository for clause-level search, obligation tracking (TI completion, free-rent expiry), and renewal-window alerts. |
| LEGAL-PRACT-MGMT | `engagement_letters` | `engagement_letter.signed` | CLM | manual_handoff | medium | Signed engagement letter is the contract artifact; corporate clients may pull it into their CLM for vendor-contract tracking. Most law firms don't push proactively; client requests |
| VET-PRACT-MGMT | `controlled_substance_ledger_entries` | `controlled_substance.dispensed` | SUP-LIFE | api_call | low | Drug-consumption events trigger reorder thresholds against distributor (Covetrus, Patterson, Henry Schein); automated reorder is the norm for chain clinics. |
| VET-PRACT-MGMT | `animal_patients` | `animal_patient.appointment_due` | CSM | api_call | low | Reminder-due events trigger multi-channel outreach (SMS, email, postcard) to pet owners; PIMS-integrated channels handle this internally. |
| VET-PRACT-MGMT | `veterinary_vaccinations` | `veterinary_vaccination.due` | CSM | api_call | medium | Due-vaccination reminders feed CSM/CCAAS outreach campaigns to pet owners. |
| ACCT-PRACT-MGMT | `engagement_letters` | `engagement_letter.signed` | CLM | manual_handoff | medium | Signed engagement letters are the contract artifact; mid-to-large firms increasingly track them in CLM for portfolio visibility and renewal management. |
| AGENCY-MGMT | `legal_contracts` | `estimate.approved` | CLM | api_call | medium | Client-approved estimate must be converted into a signed SOW in CLM before delivery can start. Includes line-item scope, billing terms, deliverable schedule, and approval routing. |
| FOOD-TRACE | `supplier_certifications` | `supplier_certification.expired` | SUP-LIFE | event_stream | medium | Supplier-certification expiry blocks new PO issuance until cert renewed; gates supplier from continued procurement. |

---

## Cross-cluster reference (data_objects in OTHER clusters that handoffs reach into)

Use these names when authoring section 4 (cross-domain edges) of any domain in this cluster.

- **PROD-MGMT** (Product Management): `product_lines`, `product_features`, `product_releases`, `product_roadmaps`, `feature_requests`, `customer_feedback_items`, `product_metrics`, `beta_programs`
- **SMM** (Social Media Management): `social_posts`, `social_accounts`, `social_messages`, `social_mentions`, `social_listening_topics`, `influencers`
- **MSP-PSA** (MSP Professional Services Automation): `msp_tickets`, `msp_contracts`, `msp_time_entries`, `msp_invoices`, `msp_clients`
- **RE-PROP-MGMT** (Residential Property Management): `rental_units`, `property_tenants`, `rental_applications`, `rent_payments`, `tenant_maintenance_requests`, `rental_leases`
- **RE-CRE** (Commercial Real Estate Operations): `commercial_leases`, `stacking_plans`, `cam_charges`, `tenant_credit_records`, `sublease_transactions`, `building_certifications`
- **GRC** (Governance, Risk and Compliance): `compliance_risks`, `compliance_controls`, `control_assessments`, `compliance_policies`, `policy_attestations`, `compliance_obligations`, `compliance_evidence`, `audit_issues`, `remediation_plans`, `risk_assessments`
- **LEGAL-PRACT-MGMT** (Legal Practice Management): `legal_matters`, `trust_accounts`, `conflict_checks`, `engagement_letters`, `external_court_filings`, `client_invoices`
- **VET-PRACT-MGMT** (Veterinary Practice Management): `animal_patients`, `pet_owners`, `veterinary_vaccinations`, `veterinary_lab_results`, `controlled_substance_ledger_entries`
- **ACCT-PRACT-MGMT** (Accounting Practice Management): `tax_returns`, `client_engagements`
- **AGENCY-MGMT** (Agency Management Software): `agency_jobs`, `agency_time_entries`, `agency_retainers`, `media_plans`, `insertion_orders`, `creative_briefs`, `creative_deliverables`, `agency_estimates`
- **FOOD-TRACE** (Food Traceability and Provenance): `traceability_lots`, `critical_tracking_events`, `key_data_elements`, `recall_events`, `supplier_certifications`
- **AUDIT** (Audit Management): `audit_plans`, `audit_engagements`, `audit_findings`, `work_papers`, `control_tests`, `audit_recommendations`, `audit_reports`, `follow_up_actions`
- **ESG** (ESG Management): `emissions_records`, `emission_factors`, `activity_data_records`, `esg_targets`, `esg_metrics`, `esg_disclosures`, `supplier_esg_assessments`, `facility_emissions`, `esg_initiatives`
- **S2P** (Source-to-Pay): `sourcing_events`, `purchase_requisitions`, `purchase_orders`, `goods_receipts`, `supplier_invoices`
- **AP-AUTO** (Accounts Payable Automation): `invoice_matches`, `payment_runs`
- **FSM** (Field Service Management): `field_visits`, `dispatch_records`, `service_work_orders`, `service_contracts`
- **OMS** (Order Management): `order_allocations`, `inventory_locations`, `sourcing_decisions`, `return_authorizations`, `store_pickup_orders`
- **KMS** (Knowledge Management): `knowledge_base_articles`, `knowledge_categories`, `article_revisions`, `article_feedback`, `knowledge_search_queries`, `knowledge_collections`
- **CONV-AI** (Conversational AI): `conversation_transcripts`, `intent_detections`, `bot_definitions`, `intent_definitions`, `conversation_flows`
- **TELCO-BSS** (Telecommunications OSS/BSS): `telco_service_catalog`, `telco_service_orders`, `telco_subscriptions`, `service_provisioning_workflows`, `network_inventory_records`, `telco_customer_bills`, `service_trouble_tickets`
- **BANK-OPS** (Banking Operations): `loan_applications`, `account_applications`, `account_openings`, `banking_kyc_reviews`, `banking_cases`, `wire_transfers`, `loan_disbursements`, `banking_transactions`
- **INS-CLAIMS** (Insurance Claims Management): `insurance_claims`, `insurance_policies`, `policy_coverages`, `loss_incidents`, `claim_adjuster_assignments`, `claim_settlements`, `claim_payments`, `salvage_recovery_records`, `subrogation_cases`, `siu_cases`
- **HC-PATIENT** (Healthcare Patient Operations): `patient_appointments`, `clinical_encounters`, `care_plans`, `patient_referrals`, `clinical_orders`, `clinical_notes`
- **PS-LIC** (Public-Sector Licensing and Permitting): `permit_applications`, `license_records`, `permit_inspections`, `license_renewals`, `code_violations`, `regulatory_fees`
- **UTIL-OPS** (Utilities Operations): `utility_customer_accounts`, `utility_meters`, `meter_reads`, `service_connections`, `utility_assets`, `outage_events`, `utility_service_orders`, `utility_bills`
- **HCM** (Human Capital Management): `employees`, `hcm_positions`, `job_profiles`, `org_units`, `employment_contracts`, `employment_events`
- **PAYROLL** (Payroll Management): `employees`, `pay_runs`, `pay_slips`, `earning_codes`, `deduction_codes`, `tax_authorities`, `tax_filings`, `garnishment_orders`, `payroll_journal_entries`, `hcm_positions`, `org_units`, `cost_centers`
- **ERP-FIN** (Core ERP Financial Management): `journal_entries`, `general_ledger_accounts`, `cost_centers`, `legal_entities`, `accounting_periods`, `bank_accounts`, `cash_transactions`, `fixed_assets`, `asset_depreciation_schedules`, `intercompany_transactions`, `revenue_recognition_records`
- **PSA** (Professional Services Automation): `service_projects`, `project_tasks`, `project_assignments`, `project_billing_milestones`, `resource_skill_inventories`, `project_resource_allocations`
- **CRM** (Customer Relationship Management): `customers`, `crm_contacts`, `crm_leads`, `crm_opportunities`, `pipeline_stages`, `sales_activities`
- **B2C-COMM** (Digital Commerce): `commerce_orders`, `order_lines`, `carts`, `commerce_products`, `commerce_storefronts`, `checkouts`, `payment_transactions`, `fulfillments`, `commerce_shipments`, `coupons`
- **CDP** (Customer Data Platform): `audience_segments`, `customers`, `customer_events`, `identity_graphs`, `customer_attributes`, `customer_journeys`
- **CPQ** (Configure-Price-Quote): `sales_quotes`, `quote_lines`, `product_configurations`, `pricing_rules`, `quote_discounts`, `discount_approvals`, `product_bundles`, `contract_drafts`
- **SMP** (SaaS Management Platforms): `saas_applications`, `saas_subscriptions`, `saas_app_assignments`, `saas_usage_metrics`, `shadow_it_apps`
- **MDM** (Master Data Management): `customer_golden_records`, `supplier_golden_records`, `employee_golden_records`, `match_rules`, `merge_rules`, `source_records`, `customers`, `suppliers`, `employees`
- **ESIGN** (Electronic Signature): `envelopes`
- **SUB-MGMT** (Subscription and Revenue Lifecycle Management): `customer_subscriptions`, `customer_invoices`, `usage_records`, `revenue_recognition_records`, `dunning_events`, `customers`
- **CCAAS** (Contact Center as a Service): `support_sessions`, `contact_records`, `queue_statistics`, `ccaas_call_recordings`, `agent_states`, `disposition_codes`

---

## Platform built-in

Reference `users` (data_object_id=748, kind=platform_builtin) for any assignee / owner / approver / creator relationship. Always section 3.

---

## OUTPUT TEMPLATE — repeat once per domain (replace the example rows)

## Domain: <DOMAIN_CODE> — <Domain Name>

### 1. Mermaid graph (intra-domain only — visualize the entity-cluster shape)

```mermaid
graph LR
  %% use snake_case data_object_name for every node; use --|verb|--> for edges
  job_postings -->|publishes| job_applications
```

### 2. Intra-domain relationships

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_postings | publishes | job_applications | one_to_many | composition | true | source | is published from | each application belongs to one posting |

### 3. Users edges (platform_builtin)

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_applications | assigned_to | users | many_to_one | reference | false | target | hiring manager for | recruiter ownership |

### 4. Cross-domain edges (clean payload→target only)

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_offers | becomes | employees | one_to_one | reference | false | target | onboarded from | only when offer accepted |

### 5. Aliases (≥1 per non-self-explanatory master)

| data_object | alias_name | alias_type | is_preferred | notes |
|---|---|---|---|---|
| job_applications | application | synonym | false | common short form |
| job_applications | candidate submission | industry_term | false | HR vendor terminology |


---

## Schema reference

### data_object_relationships schema

| Column | Type / values | Notes |
|---|---|---|
| data_object_id | reference→data_objects | The **source / subject** side. Use the data_object_name (the loader will resolve to id). |
| related_data_object_id | reference→data_objects | The **target / object** side. |
| relationship_verb | text | Parent-voice verb. Conventions: `owns`, `manages`, `schedules`, `places`, `is_assigned_to`, `extends`, `groups`, `contains`, `triggers`, `approves`, `fulfills`, `closes`, `spawns`, `becomes`. Use snake_case. |
| inverse_verb | text | Reverse phrasing for navigation: `is owned by`, `reports to`, `is scheduled by`. Natural prose, no snake_case required. |
| relationship_type | enum | `one_to_one` / `one_to_many` / `many_to_many` |
| relationship_kind | enum | `composition` (parent owns child, cascade), `reference` (loose link, no cascade), `association` (peer-to-peer M:N), `inheritance` (subtype / IS-A) |
| owner_side | enum | `source` = the row identified by data_object_id cascades into the related object on delete; `target` = the related object owns the lifecycle. Drives delete-mode derivation downstream. |
| is_required | boolean | true if mandatory in typical implementations (every Order has a Customer); false if optional. |
| notes | text | Free-form. |

### data_object_aliases schema

| Column | Type / values | Notes |
|---|---|---|
| data_object_id | reference→data_objects | The aliased entity (by data_object_name). |
| alias_name | text | The alternative term. |
| alias_type | enum | `synonym` (general alt term), `industry_term` (specific to an industry — set industry_id), `solution_term` (specific to a vendor product — set solution_id). For Step 5 only `synonym` and `industry_term` are expected; `industry_term` rows without an industry_id will be skipped by the loader. |
| is_preferred | boolean | True if this alias is more common than the canonical name in its context. Usually false. |

### Guardrails

1. **Use data_object_name (snake_case) everywhere in tables**, not labels. Loader resolves names → ids.
2. **Only reference data_objects that exist** in your cluster's domain list OR `users` (the only platform_builtin) OR data_objects that belong to other domains shown in the **cross-cluster reference list** below. Do not invent new entity names.
3. **Intra-domain edges**: every edge's both ends are data_objects belonging to a single domain in this cluster (could be the same domain). Aim for completeness — every master/embedded_master should have at least one edge unless it is a true root entity.
4. **Users edges**: cover assignee / owner / created_by / approver style relationships. Every entity that has any user-shaped role gets a users edge. Use distinct verbs (`is_owned_by`, `is_assigned_to`, `is_created_by`, `is_approved_by`).
5. **Cross-domain edges**: ONLY include where there is a clean, deterministic payload→target mapping (e.g. `candidates → becomes → employees` when a hire happens, `job_offers → spawns → onboarding_journeys`). Do NOT speculate. The cross_domain_handoffs in your brief are an existing source of truth; convert each row to a relationship edge where the payload (data_object_id) is the **from** side and the target_domain has a master data_object that is the natural recipient.
6. **Aliases**: focus on non-self-explanatory masters. A master named `hcm_employees` doesn't need an alias for "employee" because the singular is obvious. But `itsm_incidents` could alias to "ticket"; `crm_opportunities` to "deal"; `cmdb_configuration_items` to "CI". 1-3 aliases per master that benefits, none for those that don't.
7. **Avoid duplicate edges**: do not author both A→B and B→A; pick the natural source side (the side that *owns the action* in the verb). E.g. for "publishes" the publisher is source; for "is_assigned_to" the assignee-holder is source.
8. **Use `composition` sparingly**: only when delete-cascade is the obvious correct behavior (an order_line cannot exist without its order). Most edges are `reference`.
9. **`owner_side='source'`** is the right answer when the source row's lifecycle drives the related row (composition pattern). **`owner_side='target'`** is correct for "reference upward" relationships (a job_application references a job_posting; the posting is the lifecycle owner).
10. **Output is markdown only.** Do NOT call semantius or PostgREST. Write the draft to the path your prompt specifies.
