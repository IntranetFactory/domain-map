# ERP-FIN audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules` rows** (M1 hard-fail; headline finding). 7 capabilities: `GL`, `AR`, `AP`, `FIXED-ASSETS`, `CLOSE-CONSOL`, `MULTI-ENTITY`, `REVENUE-RECOG`. 12 solutions (9 primary: Workday Financial Management, SAP S/4HANA, Oracle Fusion Cloud ERP, Oracle NetSuite, Microsoft Dynamics 365 Finance, Sage Intacct, Infor CloudSuite Financials, Unit4 ERP, plus a 9th primary; 3 secondary: Deltek Vantagepoint, Workday Payroll, OneStream Platform, Workday Prism Analytics, scratch, 4 secondary). 15 rows in `domain_data_objects` rollup: 11 masters (`journal_entries` 194, `general_ledger_accounts` 195, `cost_centers` 196, `legal_entities` 197, `accounting_periods` 198, `bank_accounts` 199, `cash_transactions` 200, `fixed_assets` 201, `asset_depreciation_schedules` 202, `intercompany_transactions` 203, `revenue_recognition_records` 109) and 4 consumers (`payroll_journal_entries` 145, `benefit_enrollments` 147, `expense_reports` 210, `service_projects` 216). 10 regulations (SOX, IFRS, US GAAP, IFRS 17, SEC Climate, TCFD, EU VAT Directive, CBAM, Dodd-Frank, ASC 606). 19 `trigger_events` on the 11 masters; 13 of the 19 have empty `event_category` (Rule #13 enum violation). 3 `data_object_lifecycle_states` rows, all on `revenue_recognition_records` (pending / recognized / reversed); 10 of 11 masters carry zero lifecycle states. 0 `data_object_aliases` on any master. 25 `data_object_relationships` edges touching the 11 masters (intra and cross-domain mixed). 16 outbound cross-domain handoffs and 97 inbound = 113 cross-domain handoffs total. 1 `skills` row (`erp-fin-system` id 56, `skill_type='system'`, `domain_module_id=NULL`) with 12 `skill_tools` rows, all `coverage_tier='platform'`. 1 `business_function_domains` row (Accounting, owner). 0 ERP-FIN-prefixed `permissions` rows. 16 of 113 handoffs (14%) carry `handoff_processes` tags; 15 are `discovery_substring` or `discovery_override`, 1 is `agent_curated` (handoff 518 to OMS-billing, process 1352 "Transmit billing data to customers"). 0 `record_status='approved'`.

- **Vendor-surface basis (Pass 2 flagship enumeration):** SAP S/4HANA Finance, Oracle Fusion Cloud ERP Financials, Workday Financial Management, Oracle NetSuite ERP Financials, Microsoft Dynamics 365 Finance, Sage Intacct, Infor CloudSuite Financials, Acumatica Financials, Unit4 ERP, IFS Cloud Financials, Epicor Kinetic Financials, QAD Adaptive Financials. The vertical "core financials" market is one of the largest and longest-standing enterprise software categories; vendor scope is the canonical accounting backbone (GL, AP, AR, fixed assets, period close, multi-entity / multi-currency consolidation, revenue recognition). Compliance specialists: not vendor-led (SOX / IFRS / US GAAP are statutory frameworks not market-distinct vendor categories) but functional-specialist tools exist for sub-areas: BlackLine and FloQast (close acceleration), Trintech (financial close + reconciliation), OneStream and Workiva (consolidation / EPM bridge). Anaplan, Vena, Pigment overlap with EPM and stay out of ERP-FIN. Modern niche entrants in mid-market: Ramp Treasury, Tipalti (also belongs in AP-AUTO 29), Pleo, Spendesk overlap with EXPENSE / SPEND-MGMT and stay out of ERP-FIN. ACCT-PRACT-MGMT (152) handles accounting-firm operations (a separate market) and is excluded from this vendor surface.

- **Bucket 1 (in-scope, agent fixable):** 7 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 11 items (8 entity candidates + 3 regulation candidates; modularization choice surfaced as B2-S4 and not double-counted).

**Headline structural finding (M1 hard-fail).** ERP-FIN has zero `domain_modules` rows. Per Rule #14 every `domains` row needs at least one full module, and a 7-capability market needs at least 2 full modules. This is the root cause of every downstream M-band, F-band, and most B / C / E findings. The fix is to author the module set (proposed in Bucket 1 below). M2, M4, M5, M6 cascade vacuously. F1-F5 cascade because Rule #17 (1 system skill per module, with skill_tools) is uncomputable without modules: the existing skill 56 is domain-anchored (legacy pre-modular shape per the SKILL.md transitional note). E1-E6 cascade because workflow-gate permissions materialize from lifecycle states scoped to a `domain_module_id`. B5 (`embedded_master` integrity) passes trivially because ERP-FIN currently has zero `embedded_master` rows. The proposed module shape (Pass 2 / Pass 4 informed): `ERP-FIN-GL-CLOSE` (covers GL, accounting_periods, journal_entries, intercompany_transactions, period close), `ERP-FIN-AR-BILLING` (AR-side; though most billing depth lives in OMS / SUB-MGMT), `ERP-FIN-AP-DISBURSE` (AP-side; though core AP-automation depth lives in AP-AUTO 29), `ERP-FIN-FIXED-ASSETS` (fixed_assets, asset_depreciation_schedules), `ERP-FIN-CASH-BANKING` (bank_accounts, cash_transactions, reconciliation), `ERP-FIN-REVREC-CONSOL` (revenue_recognition_records, consolidation across legal_entities, intercompany matching, multi-currency translation). Six modules is the realistic ceiling; a defensible 2-module minimum is `ERP-FIN-GL-CLOSE` + `ERP-FIN-CONSOL-REVREC` and remaining four are an authoring conversation.

**Neighbor discovery** (ranked by edge weight: outbound + inbound + DMDO touch points). Inbound handoff counts derived from the 97-row inbound query, outbound from the 16-row outbound query.

| Neighbor | Out | In | DMDO touch | Weight | Pass shape |
|---|---|---|---|---|---|
| EPM | 4 (journal_entry.posted, accounting_period.closed x2, depreciation.posted, cost_center.created, gl_account.mapping_changed) | 2 (financial_plan.approved x2, budget_revision.published) | none | 6 | Pairwise (full) |
| AUDIT | 8 (journal_entry.posted, fixed_asset.disposed, accounting_period.closed, intercompany.mismatch_detected, legal_entity.created, cash_transaction.unmatched, supplier_invoice.duplicate flow-through, others) | 2 (audit_finding.published, audit_evidence.collected) | none | 10 | Pairwise (full) |
| AP-AUTO | 0 | 5 (payment_run.executed, supplier_invoice.matched, supplier_invoice.duplicate_detected, payment.exception, others) | none | 5 | Pairwise (full) |
| PSA | 0 (outbound to PSA-RESOURCE-MGMT, scratch) | 5 (project_billing_event.posted, time_entry.approved, expense.approved, project_resource_allocation.committed, others) | service_projects consumer required (216) | 6 | Pairwise (full) |
| PAYROLL | 0 | 4 (pay_cycle.posted, pay_run.committed, employer_tax.posted, others) | payroll_journal_entries consumer required (145) | 5 | Pairwise (full) |
| HCM | 0 | 1 (employee.terminated for cost-center reassignment) | cost_centers (196, ERP-FIN masters; HCM consumer of cost_centers) | 2 | Lightweight |
| BEN-ADMIN | 0 | 2 (benefit_enrollment.activated, benefit_invoice.posted) | benefit_enrollments consumer required (147) | 3 | Pairwise (full) |
| EXPENSE | 0 | 2 (expense_report.approved, card_transaction.posted-via-SPEND-MGMT) | expense_reports consumer required (210) | 3 | Pairwise (full) |
| OMS | 0 | 5 (sourcing_decision.computed, store_pickup_order.expired, sales_order.invoiced, others) | none | 5 | Pairwise (full) |
| SPEND-MGMT | 0 | 4 (card_transaction.posted, bill_payment.completed, spend_request.approved, virtual_card.issued) | none | 4 | Pairwise (full) |
| S2P | 0 | 2 (purchase_order.received, supplier_invoice.posted-from-S2P) | none | 3 | Pairwise (full) |
| CLM | 0 | 1 (legal_contract.signed, financial-impact lifecycle) | none | 1 | Lightweight |
| ESG | 0 | 3 (esg_disclosure.published x2, carbon_inventory.recalculated) | none | 3 | Pairwise (full) |
| GRC | 0 (outbound goes through AUDIT) | 0 direct here; flows via AUDIT | none | 0 | Lightweight |
| TPRM | 0 | 1 (vendor_financial_review.required) | none | 1 | Lightweight |
| MFG-OPS | 0 | 3 (production_completion.recorded, scrap.recorded, material_consumption.posted) | none | 3 | Pairwise (full) |
| INV-MGMT | 0 | 2 (inventory_revaluation.computed, stock_transfer.posted) | none | 2 | Lightweight |
| RET-STORE | 0 | 2 (store_close.completed, cash_drop.posted) | none | 2 | Lightweight |
| PLM | 0 | 3 (engineering_change_order.released, engineering_part.released, product_compliance_declaration.approved) | none | 3 | Pairwise (full) |
| TELCO-BSS | 0 | 2 (rated_event.computed, customer_charge.posted) | none | 2 | Lightweight |
| BANK-OPS | 0 | 2 (loan_servicing.posted, deposit_interest.accrued) | none | 2 | Lightweight |
| INS-CLAIMS | 0 | 3 (claim_payment.issued x2, premium.collected) | none | 3 | Pairwise (full) |
| UTIL-OPS | 0 | 2 (meter_billing.computed, customer_bill.posted) | none | 2 | Lightweight |
| HC-PATIENT | 0 | 2 (patient_charge.posted, insurance_payment.received) | none | 2 | Lightweight |
| PS-LIC | 0 | 2 (license_fee.collected, permit_payment.posted) | none | 2 | Lightweight |
| ITAM | 0 | 1 (asset_lifecycle_event.recorded) | none | 1 | Lightweight |
| SUB-MGMT | 0 | 3 (subscription_billing_run.posted, mrr.computed, churn.realized) | none | 3 | Pairwise (full) |
| MA | 0 | 3 (mortgage_payment.collected, escrow_disbursement.posted, foreclosure.realized) | none | 3 | Pairwise (full) |
| LSD | 0 | 2 (legal_matter.cost_recorded, settlement.posted) | none | 2 | Lightweight |
| FUND-ADMIN | 0 | 2 (nav.computed, investor_distribution.posted) | none | 2 | Lightweight |
| ACCT-PRACT-MGMT | 0 | 2 (client_engagement.fee_posted, billable_hour.posted) | none | 2 | Lightweight |
| FMIS | 0 | 2 (government_budget_authority.set, treasury_disbursement.executed) | none | 2 | Lightweight |
| FLEET-MGMT / FLEET-MAINT | 0 | 3 (fuel_purchase.posted, fleet_maintenance.posted, vehicle_lease.activated) | none | 3 | Pairwise (full) |
| FSM | 0 | 1 (service_work_order.invoiced) | none | 1 | Lightweight |
| AGENCY-MGMT | 0 | 3 (creative_invoice.posted, media_buy.committed, retainer.activated) | none | 3 | Pairwise (full) |
| LEGAL-PRACT-MGMT | 0 | 2 (matter_invoice.posted, trust_account.disbursement) | none | 2 | Lightweight |
| VET-PRACT-MGMT | 0 | 1 (patient_invoice.posted) | none | 1 | Lightweight |
| MSP-PSA | 0 | 2 (ticket_billing.posted, contract_renewal.posted) | none | 2 | Lightweight |
| CSM | 0 | 1 (renewal_committed.financial_impact) | none | 1 | Lightweight |
| CRM | 0 | 1 (opportunity_won.financial_impact) | none | 1 | Lightweight |
| CPQ | 0 | 2 (quote_accepted.financial_impact, deal_committed.financial_impact) | none | 2 | Lightweight |
| FOOD-TRACE / DAIRY-MGMT | 0 | 3 (commodity_payment.posted, raw_milk_intake.posted, animal_disposal.posted) | none | 3 | Pairwise (full) |
| IWMS / REAL-EST / RE-PROP-MGMT | 0 | 5 (lease_payment.posted, lease_termination.posted, property_purchase.closed, others) | none | 5 | Pairwise (full) |
| FARMER-DIRECT-SALES | 0 | 1 (direct_sale.posted) | none | 1 | Lightweight |

The neighbor list reflects ERP-FIN's role as the catalog's accounting backbone: outbound is dominated by ledger-state changes (period close, journal posted, GL hierarchy changes, fixed asset disposal); inbound is dominated by sub-ledger postings from every transactional domain (payroll, AP, AR / billing, expense, inventory, capital markets, insurance, telco, real estate, professional services). The vast majority of inbound rows are `subledger.posted` flavors that map cleanly to APQC L3 "Process payments" or "Record general accounting" subprocesses.

**Structural pass bands:**
- **S1 (FK coverage sweep):** `domain_modules` zero (M1 fail); `domain_data_objects` 15 (B1 pass); `capability_domains` 7 (A2 pass); `solution_domains` 12 (A3 pass); `domain_regulations` 10 (pass); `handoffs.source_domain_id` 16 (pass); `handoffs.target_domain_id` 97 (pass); `business_function_domains` 1 (sparse, C1 partial-pass).
- **S2 (per-module coverage):** vacuous, no modules.
- **S3 (per-master indirect coverage):** **fails** for 10 of 11 masters (no lifecycle states, no aliases). Only `revenue_recognition_records` carries 3 lifecycle states.
- **A1 (domains row metadata):** **partial-fail** (Rule #18: domain description contains an em-dash at position approximately the second sentence: "the regulated calc kernel inside an otherwise transactional ledger"; `business_logic` field also carries one). CLAUDE.md and Rule #15 both ban em-dashes. Other A1 fields populated correctly (`crud_percentage=75`, `min_org_size='20 s <500'`, `cost_band='$$$$$'`, `usa_market_size_usd_m=25000`, `market_size_source_year=2025`). 
- **A2 (capabilities):** 7 rows, pass.
- **A3 (solutions):** 12 rows with 9 primary, pass.
- **M1 (≥1 domain_modules):** **HARD-FAIL** (0 rows). Headline structural finding.
- **M2 (≥2 modules for ≥3 capabilities):** vacuous (M1 fails first; once M1 is fixed, M2 requires ≥2 for the 7-capability spread, target ≥4 modules to meaningfully split GL / AP / AR / FIXED-ASSETS / CASH / CONSOL).
- **M4, M5, M6:** vacuous (no modules to host capabilities, no lifecycle states with `domain_module_id`, no orphan-module check).
- **M7 (single-master integrity):** pass (each of the 11 masters has exactly one `role='master'` row; ERP-FIN owns all of them).
- **B1 (≥1 master):** pass (11 masters).
- **B2 (singular_label / plural_label):** pass.
- **B3 (naming arbitration):** pass (every master is prefixed-style; no bare-word claims).
- **B4 (pattern flags positive re-evaluation per Rule #12):** **fail**. Every master row has all three pattern flags `false`. Several rows warrant `has_submit_lock=true` and `has_single_approver=true`: `journal_entries` (posting is a one-way state lock), `accounting_periods` (close is a one-way state lock with single-approver controller), `intercompany_transactions` (matching is a controllership-approver workflow), `fixed_assets` (capitalization and disposal are single-approver), `revenue_recognition_records` (recognition is controllership-approver). `has_personal_content` is likely false on all masters (financial ledger entries are not personal-content under GDPR / CPRA). Surface as B2-S2.
- **B5 (embedded_master integrity):** vacuous (no embedded_master rows on ERP-FIN; cascades from M1).
- **B6 (intra-domain relationships):** **partial pass**. Several edges exist but the master-to-master coverage is thin: `cost_centers funds work_orders / programs` (7, 95), `legal_entities sponsors something` (125), `journal_entries` is the sink-target for many `posts_to` edges. Missing edges that should exist: `journal_entries posted_against accounting_periods`, `journal_entries posted_against general_ledger_accounts`, `journal_entries posted_against cost_centers`, `journal_entries scoped_by legal_entities`, `cash_transactions reconciled_against bank_accounts`, `fixed_assets owned_by legal_entities`, `fixed_assets governed_by asset_depreciation_schedules`, `intercompany_transactions between legal_entities`, `revenue_recognition_records affects journal_entries`, `accounting_periods scoped_by legal_entities`. Routes to B1-S5 below.
- **B7 (users edges):** **fail**. No `users` edges on any ERP-FIN master, but ledger workflows reference users heavily (journal-entry preparer, approver, controllership reviewer for accounting_periods, legal_entities responsible_party). Routes to B1-S5.
- **B8 (cross-domain outbound payload-to-target relationships):** **fail** for most outbound. The 16 outbound handoffs imply payload-to-target edges that are missing for most rows. The 25-row relationship sample contains a few cross-domain edges (`work_orders impacted by fixed_assets` 207 / 277, `vendor_master_in_bank_accounts` 567) but most outbound payloads need explicit edges to their target domain's masters. Routes to B1-S5.
- **B9 (trigger_events + event_category enum):** **partial-fail**. 19 events on ERP-FIN masters; 13 of 19 have empty `event_category` (Rule #13 enum requires `lifecycle | state_change | threshold | signal`). Specifically empty: 543 (`accounting_period.opened`), 544 (`accounting_period.reopened`), 545 (`gl_account.created`), 546 (`gl_account.mapping_changed`), 547 (`cost_center.created`), 548 (`cost_center.deactivated`), 549 (`legal_entity.created`), 550 (`bank_account.added`), 551 (`bank_account.statement_received`), 552 (`cash_transaction.posted`), 553 (`cash_transaction.unmatched`), 554 (`fixed_asset.capitalized`), 555 (`fixed_asset.disposed`), 556 (`depreciation.posted`), 557 (`intercompany_transaction.posted`), 558 (`intercompany.mismatch_detected`). Counting that is 16 (not 13). Already correctly populated: 3 (`accounting_period.closed` state_change), 107 (`revenue.recognised` state_change), 152 (`journal_entry.posted` lifecycle). Routes to B1-S2.
- **B10 (handoffs FK shape):** **massive fail**. All 16 outbound handoffs have NULL `source_domain_module_id` (in-scope, but unfixable without M1) AND NULL `target_domain_module_id` (owed by target domains, except for AUDIT and EPM where ERP-FIN owns nothing). On the 97 inbound: 65 have NULL `source_domain_module_id` (owed by source domains, report-only) and ALL 97 have NULL `target_domain_module_id` (in-scope, but unfixable until M1 is resolved). The fix is gated on the module set.
- **B11 (aliases):** **fail** for every master (0 aliases across 11 masters). Industry / vendor aliases warrant population: `general_ledger_accounts` -> "Chart of Accounts" (universal alias), "Account" (Sage), "G/L Account" (SAP); `journal_entries` -> "Journal Voucher" (Oracle), "JE" (universal short form); `accounting_periods` -> "Fiscal Period", "Period"; `legal_entities` -> "Company Code" (SAP), "Entity"; `cost_centers` -> "Cost Object", "Cost Pool"; `fixed_assets` -> "Capital Assets", "Asset Master Record"; `intercompany_transactions` -> "IC Postings", "Cross-Entity Journal Entries"; `revenue_recognition_records` -> "RevRec Records", "Performance Obligation Records" (ASC 606 / IFRS 15 terminology). Routes to B1-S4.
- **B12 (lifecycle states):** **fail** for 10 of 11 masters. Only `revenue_recognition_records` has the (pending / recognized / reversed) state machine. Missing state machines: `journal_entries` (draft / posted / reversed / void), `accounting_periods` (future / open / soft_close / hard_close / reopened), `intercompany_transactions` (entered / matched / unmatched / eliminated), `fixed_assets` (acquired / capitalized / in_service / impaired / disposed / retired), `cash_transactions` (imported / matched / unmatched / posted / reconciled). `general_ledger_accounts` and `cost_centers` may be config-shape (active / inactive); surface as part of B2-S3. Routes to B1-S5.
- **C1 (business_function_domains):** **partial-fail**. Only 1 row (Accounting owner). Expected to also surface: Finance (contributor for treasury / banking / fixed-assets sub-areas), FP&A (consumer for EPM bridge), Tax (consumer for legal-entity / multi-jurisdiction work), Treasury (contributor for bank-accounts / cash-transactions). Routes to B1-S3.
- **D (process-skill discovery):** out-of-scope per the per-domain checklist (substrate-level analytic).
- **E1-E6 (roles + permission bundling):** **fail** cascade. 0 ERP-FIN-prefixed permissions, 0 role_modules entries pointing at ERP-FIN modules (because there are no modules). 3 finance-flavored roles exist (`FINANCE-INVENTORY-ACCOUNTANT`, `FINANCE-IT-COST-ANALYST`, `BUSINESS-OPS-PROJECT-FINANCE-CONTROLLER`) but all their `role_modules` point at INV-MGMT, ITAM, PSA modules (no ERP-FIN target). Once M1 is fixed, expect to add at least 5 ERP-FIN-scoped roles: `FINANCE-CONTROLLER`, `FINANCE-AP-ACCOUNTANT`, `FINANCE-AR-ACCOUNTANT`, `FINANCE-FIXED-ASSETS-ACCOUNTANT`, `FINANCE-TREASURY-ANALYST`, plus cross-functional `CFO` and `AUDITOR-EXTERNAL` (read-only).
- **F1-F5 (system skill + tools + Semantius score):** **F2 fail** (the single `erp-fin-system` skill row 56 has `skill_type='system'` but `domain_module_id=NULL`, which is the pre-modular legacy shape per the SKILL.md transitional note; under Rule #17 every `domain_modules` row needs exactly 1 such skill with `domain_module_id` set). The 12 `skill_tools` rows (11 `query_*` rows + 1 `send_email`) are all `coverage_tier='platform'`. Strict score on this single domain-anchored skill is **100%** (12/12 platform). Once the skill is re-anchored to specific modules under Rule #14 / Rule #17, the score recomputes per-module. The catalog has no `create_*` / `update_*` / lifecycle-gate tools (no `post_journal_entry`, `close_accounting_period`, `capitalize_fixed_asset`, `recognize_revenue`, `match_intercompany_transactions`, `reconcile_bank_statement`) which are the workflow-bearing primitives the modules will need. Routes to B1-S6.
- **F7 (channel-primitive justification):** the single channel primitive `send_email` is justified for accounting workflow notifications (period-close reminders to controllers, intercompany mismatch alerts, depreciation-posted confirmations to FP&A). Note column is empty; clean. **Authoring default per the channel-vs-capability rule** (§ "Channel vs capability authoring rule"): switch to `notify_person` / `notify_team` when the modules are loaded; raw `send_email` is appropriate only when the workflow specifically requires email (e.g., supplier-facing remittance advice).
- **H1 (APQC tagging headline):** **HARD-FAIL**. Catalog quality: **0 of 113 cross-domain handoffs `record_status='approved'`**. Process health side-bar: **1 `agent_curated`** (handoff 518, "Transmit billing data to customers" 1352), **15 `discovery_substring` / `discovery_override`**, 97 untagged. Volume expectation per H1: 0.5N to 0.8N for N=113 implies 57 to 90 agent_curated tags target. The audit proposes ~60 candidates from the analyst's pass-3 model; see the H1 sub-table in B1-S7.
- **Rule #15 audit (notes columns):** **5 polluted rows on `domain_data_objects`**: DDO 145 (`payroll_journal_entries` consumer, note "ERP-FIN consumes payroll_journal_entries from pay_runs to post personnel cost to the GL."), DDO 147 (`benefit_enrollments` consumer, note "ERP-FIN accrues employer benefit cost based on active benefit_enrollments."), DDO 196 (`cost_centers` master, note "ERP-FIN masters the canonical cost-center hierarchy; HCM and EPM contribute org-alignment and budget-mapping slices respectively."), DDO 201 (`fixed_assets` master, note "Financial-asset master; distinct from operational hardware_assets in ITAM/CMDB."), DDO 210 (`expense_reports` consumer, note "ERP-FIN consumes approved expense_reports for journal entry posting and reimbursement routing."), DDO 216 (`service_projects` consumer, note "ERP-FIN consumes project codes for cost allocation, billing, and rev-rec."). Six rows. Were these user-approved at load time or auto-populated? Surfaced as B2-S1.
- **Rule #18 audit (vendor names in description columns):** clean on `domains.description` for ERP-FIN. `business_logic` is clean. `capabilities` descriptions clean. Vendor names appear only on `solutions` rows (allowed). One minor concern: `data_objects.notes` on row 201 (`fixed_assets`) carries no vendor name (`Financial-asset master; distinct from operational hardware_assets in ITAM/CMDB.`); that text refers to ITAM / CMDB which are domain codes not vendor names, so Rule #18 is not violated, but Rule #15 still bans the prose without user approval (covered by B2-S1).

ERP-FIN strict Semantius score on the legacy domain-anchored skill 56: **100%** (12 / 12 platform tools). The score is uninformative for the module audit because the underlying skill row violates F2 (Rule #17 requires module-anchored). Re-anchoring to ~6 modules will likely keep the per-module score high (every catalog query tool is platform-covered) but the workflow-bearing primitives (`post_journal_entry`, `close_accounting_period`, etc.) are not yet authored and will probably be `external` or `integration` tier when first added (e.g., delivered via a SAP / Oracle / NetSuite MCP, not Semantius-native). Expect the score to drop materially once those tools land.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard-fail, no modules** | ERP-FIN has zero `domain_modules` rows. Headline structural finding. Cascades to M2 / M4 / M5 / M6, B10 (cannot fix NULL FKs on inbound 97 + outbound 16), F2 (skill 56 needs re-anchoring), and E1-E6 (no module-prefixed permissions). | Author the module set. Proposed 6 modules: `ERP-FIN-GL-CLOSE` (masters: journal_entries, general_ledger_accounts, accounting_periods, legal_entities), `ERP-FIN-AR-BILLING` (limited to invoice-side GL posting; OMS / SUB-MGMT own customer-facing billing), `ERP-FIN-AP-DISBURSE` (limited to disbursement-side GL posting; AP-AUTO 29 owns supplier-invoice processing), `ERP-FIN-FIXED-ASSETS` (masters: fixed_assets, asset_depreciation_schedules), `ERP-FIN-CASH-BANKING` (masters: bank_accounts, cash_transactions), `ERP-FIN-REVREC-CONSOL` (masters: revenue_recognition_records, intercompany_transactions; capabilities: CLOSE-CONSOL, MULTI-ENTITY, REVENUE-RECOG). Master-to-module mapping above. Defensible 2-module minimum (Rule #14 floor for ≥3 capabilities): `ERP-FIN-GL-CLOSE` + `ERP-FIN-REVREC-CONSOL`; remaining 4 are an authoring conversation. Each module also needs: 1 `domain_module_capabilities` row per realized capability, 1 `domain_module_data_objects` row per master / embedded_master / consumer, 3 baseline permissions per Rule #14 (`<module>:read`, `:manage`, `:admin`), 1 `skill_type='system'` skill per Rule #17 with module-scoped `skill_tools`. |
| B1-S2 | **B9 missing event_category** | 16 trigger_events have empty `event_category` (Rule #13 enum violation): 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 556, 557, 558. | PATCH each row: 543 / 544 (`accounting_period.opened` / `.reopened`) `state_change`; 545 / 546 (`gl_account.created` / `.mapping_changed`) `lifecycle` for `created`, `state_change` for `mapping_changed`; 547 / 548 (`cost_center.created` / `.deactivated`) `lifecycle` / `state_change`; 549 (`legal_entity.created`) `lifecycle`; 550 (`bank_account.added`) `lifecycle`; 551 (`bank_account.statement_received`) `signal`; 552 (`cash_transaction.posted`) `lifecycle`; 553 (`cash_transaction.unmatched`) `signal`; 554 (`fixed_asset.capitalized`) `state_change`; 555 (`fixed_asset.disposed`) `state_change`; 556 (`depreciation.posted`) `lifecycle`; 557 (`intercompany_transaction.posted`) `lifecycle`; 558 (`intercompany.mismatch_detected`) `signal`. The `signal` cut for unmatched and statement-received aligns with the existing `signal` usage in other domains (DLP, threat detection); the `lifecycle` cut for `.created` / `.posted` aligns with `journal_entry.posted` (already correctly tagged `lifecycle`). B2-S5 below is the convention-confirmation question. |
| B1-S3 | **C1 sparse business_function_domains** | Only 1 row (Accounting owner). Missing: Finance (contributor) for treasury / banking / fixed-assets sub-areas, FP&A (consumer) for EPM bridge, Tax (consumer) for multi-jurisdiction / legal-entity work, Treasury (contributor) for bank-accounts / cash-transactions. | INSERT 4 `business_function_domains` rows pointing at the relevant `business_functions` rows (lookup by name: Finance, FP&A, Tax, Treasury). If the function spine does not carry Tax or Treasury as first-class functions, the row instead points at "Finance" with `responsibility_type='contributor'`. |
| B1-S4 | **B11 aliases missing on every master** | Zero `data_object_aliases` rows for any of the 11 masters. | INSERT alias rows per the master-by-master list above: `general_ledger_accounts` aliases ("Chart of Accounts", "G/L Account", "Account"); `journal_entries` ("Journal Voucher", "JE", "Posting"); `accounting_periods` ("Fiscal Period", "Period"); `legal_entities` ("Company Code", "Entity", "Reporting Entity"); `cost_centers` ("Cost Object", "Cost Pool", "Profit Center" partial); `bank_accounts` ("Cash Account"); `fixed_assets` ("Capital Assets", "Asset Master Record"); `intercompany_transactions` ("IC Postings", "Cross-Entity Postings"); `revenue_recognition_records` ("RevRec Records", "Performance Obligation Records"); `cash_transactions` ("Bank Transaction", "Cash Line"); `asset_depreciation_schedules` ("Depreciation Run", "Depreciation Method"). Approx 25 alias rows. |
| B1-S5 | **B6 / B7 / B8 intra and cross-domain relationship gaps** | Multiple master-to-master and master-to-users edges missing. See narrative above. | INSERT the edge list. Specifically: `journal_entries posted_against accounting_periods` (one_to_many), `posted_against general_ledger_accounts` (one_to_many), `posted_against cost_centers` (one_to_many), `scoped_by legal_entities` (many_to_one); `cash_transactions reconciled_against bank_accounts`; `fixed_assets owned_by legal_entities`, `governed_by asset_depreciation_schedules`; `intercompany_transactions between legal_entities` (many_to_many self-join); `revenue_recognition_records produces journal_entries`; `accounting_periods scoped_by legal_entities`. Users edges (Rule #10): `journal_entries created_by users` and `approved_by users`; `accounting_periods closed_by users`; `legal_entities owned_by users`; `fixed_assets approved_by users`; `intercompany_transactions reconciled_by users`. Approx 15-20 rows. |
| B1-S6 | **F2 / F3 skill re-anchoring (cascades from M1)** | Skill 56 (`erp-fin-system`) has `domain_module_id=NULL` (legacy pre-modular shape). Rule #17 wants 1 system skill per module. Once M1 is fixed, the existing 12 `skill_tools` rows split across the new modules. | After B1-S1 lands, author 6 new `skills` rows (1 per module, `skill_type='system'`, `domain_module_id` set, name pattern `<module_code>_agent` lowercase). Migrate `skill_tools` rows: query_journal_entries / query_general_ledger_accounts / query_accounting_periods to `erp-fin-gl-close_agent`; query_legal_entities / query_intercompany_transactions / query_revenue_recognition_records to `erp-fin-revrec-consol_agent`; query_cost_centers split across `erp-fin-gl-close_agent` (the master lives there); query_bank_accounts / query_cash_transactions to `erp-fin-cash-banking_agent`; query_fixed_assets / query_asset_depreciation_schedules to `erp-fin-fixed-assets_agent`; `send_email` (or its replacement `notify_person`) to whichever module needs the workflow notification. ALSO author the missing workflow-bearing tools: `post_journal_entry` (mutate), `reverse_journal_entry` (mutate), `close_accounting_period` (mutate), `reopen_accounting_period` (mutate), `capitalize_fixed_asset` (mutate), `dispose_fixed_asset` (mutate), `run_depreciation` (compute), `recognize_revenue` (mutate), `match_intercompany_transactions` (compute), `reconcile_bank_statement` (compute). These will land at `coverage_tier='external'` or `integration` (delivered via SAP / Oracle / NetSuite MCP), dropping the per-module strict Semantius score materially. Then DELETE skill 56 row. |
| B1-S7 | **H1 (hard fail), APQC tagging** | Of 113 cross-domain handoffs, only 16 carry `handoff_processes` rows; 0 are `record_status='approved'`. Catalog quality (the headline) = 0 approved. Process health side-bar: 1 `agent_curated`, 15 `discovery_*`, 97 untagged. Volume expectation per H1: 0.5N to 0.8N for N=113 = 57 to 90 agent_curated tags. The audit proposes 60 candidates (see B1-H1 sub-table below). | Insert `handoff_processes` rows per the candidate table. Each new row: `(handoff_id, process_id, proposal_source='agent_curated', record_status='new', role='implements')`. The PCF `process_id` lookup is at fix time via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`. |

#### B1-H1 APQC TAGGING (proposed candidates)

H1 counts as ONE Bucket 1 item even though it proposes ~60 row inserts (per the orchestrator instruction Rule #10).

**Strategy.** The 16 outbound handoffs all map cleanly to PCF L3 / L4 children under "Manage financial accounting and reporting" (10729 L2, "Perform revenue accounting") or "Perform general accounting" (10732 L3) or "Process accounts payable and expense reimbursements" (10733 L3). The 97 inbound handoffs are dominated by `<subledger>.posted` events from transactional domains; each maps to "Record general accounting" (a PCF L4) or "Process payments" (10734 L3) or a domain-specific L3 ("Manage payroll", "Process customer credit", etc.). The candidate table below lists confident matches; medium-confidence and deferred rows are flagged.

**Outbound (ERP-FIN-published, target = downstream domain):**

| handoff_id | source -> target | trigger_event | Proposed PCF row | Confidence |
|---|---|---|---|---|
| 124 | ERP-FIN -> EPM | `payroll_period.closed` payload `payroll_journal_entries` | Perform planning and management accounting (10728 L3) | confident L3 |
| 133 | ERP-FIN -> EPM | `accounting_period.closed` payload `journal_entries` | Perform planning and management accounting (10728 L3) | confident L3 |
| 189 | ERP-FIN -> AUDIT | `journal_entry.posted` | Manage internal controls (16370 L3) | confident L3 |
| 190 | ERP-FIN -> GRC | `journal_entry.posted` | Manage internal controls (16370 L3) | confident L3 |
| 531 | ERP-FIN -> AUDIT | `accounting_period.closed` | Perform financial close (10732 L4) or Manage internal controls (16370 L3) | confident L3 |
| 532 | ERP-FIN -> EPM | `accounting_period.closed` | Perform planning and management accounting (10728 L3) | confident L3 |
| 533 | ERP-FIN -> GRC | `accounting_period.reopened` | Manage internal controls (16370 L3) | confident L3 |
| 534 | ERP-FIN -> EPM | `gl_account.mapping_changed` | Perform planning and management accounting (10728 L3) | confident L3 |
| 535 | ERP-FIN -> EPM | `cost_center.created` | Perform planning and management accounting (10728 L3) | medium L3 |
| 536 | ERP-FIN -> AUDIT | `legal_entity.created` | Manage internal controls (16370 L3) | medium L3 |
| 537 | ERP-FIN -> AP-AUTO | `bank_account.added` | KEEP existing `discovery_substring` at 320 (Manage in-house bank accounts L3); REPLACE with `agent_curated` | confident L3 |
| 538 | ERP-FIN -> AUDIT | `cash_transaction.unmatched` | Operate financial controls and procedures (10936 L4) or Manage internal controls (16370 L3) | confident L4 |
| 539 | ERP-FIN -> AUDIT | `fixed_asset.disposed` | Manage fixed-asset accounting (10737 L3) or Manage internal controls (16370 L3) | confident L3 |
| 540 | ERP-FIN -> EPM | `depreciation.posted` | KEEP existing `discovery_substring` at 1392 (Calculate and record depreciation expense L4); REPLACE with `agent_curated` | confident L4 |
| 541 | ERP-FIN -> AUDIT | `intercompany.mismatch_detected` | KEEP existing `discovery_substring` at 1382 (Post and reconcile intercompany transactions L4); REPLACE with `agent_curated` | confident L4 |
| 597 | ERP-FIN -> AP-AUTO | `bank_account.statement_received` | KEEP existing `discovery_substring` at 320 (Manage in-house bank accounts L3); REPLACE with `agent_curated` | confident L3 |

**Inbound (ERP-FIN-received, source = transactional domain):**

| handoff_id range | source domain | typical trigger_event | Proposed PCF row | Confidence |
|---|---|---|---|---|
| 99 | PAYROLL -> ERP-FIN | `pay_cycle.posted` payroll_journal_entries | Manage payroll (10539 L3) or Process payroll (10737 L3-related) | confident L3 |
| 125, 126, 191, 192 | AP-AUTO -> ERP-FIN | payment_run.*, supplier_invoice.* | Process accounts payable (10733 L3) | confident L3 (KEEP existing on 192) |
| 129, 1127, 1128 | EXPENSE / PSA -> ERP-FIN | expense_report.approved, time/expense from PSA | Process accounts payable and expense reimbursements (59 L2) | confident L2 (KEEP existing on 1128) |
| 166, 167, 169 | SPEND-MGMT -> ERP-FIN | card_transaction.posted, bill_payment.completed, spend_request.approved | Process accounts payable (10733 L3) | confident L3 |
| 109 | BEN-ADMIN -> ERP-FIN | benefit_enrollment.activated | KEEP existing `discovery_substring` at 1052 (Administer benefit enrollment L4); REPLACE with `agent_curated` | confident L4 |
| 131 | PSA -> ERP-FIN | project_billing_event.posted | KEEP existing `discovery_substring` at 55 (Perform revenue accounting L2); REPLACE with `agent_curated` at a tighter L3 child (Process customer credit / Invoice customers 10727 L3) | confident L3 |
| 197 | similar billing flow | | KEEP existing `discovery_substring` at 55; REPLACE | confident L3 |
| 213 | SUB-MGMT -> ERP-FIN | subscription billing | KEEP existing `discovery_override` at 167 (Manage suppliers L3); REPLACE because this is BILLING side (Invoice customers 10727 L3) | confident L3 |
| 503, 582, 925, 950, 563 | OMS / S2P / MFG-OPS / PLM | sales / production / PO postings | KEEP existing rows; REPLACE with `agent_curated` confirmation | confident L4 |
| 518 | OMS-billing | | ALREADY `agent_curated` at 1352 (Transmit billing data to customers L4); no change needed | confident L4 |
| 1088, 1090, 1093 | PLM -> ERP-FIN | engineering_change_order.released, engineering_part.released, product_compliance_declaration.approved | Develop and manage products and services (10005 L3) or Cost of goods accounting (subprocess) | medium L4 |
| 632 | ITAM -> ERP-FIN | asset_lifecycle_event.recorded | Manage fixed-asset accounting (10737 L3) | confident L3 |
| 991, 995 | OMS -> ERP-FIN | sourcing_decision.computed, store_pickup_order.expired | Manage logistics and warehousing (subprocess) or Record sales accounting | medium L4 |
| 306, 1141, 317, 326, 345, 346 | various billing sources | | Record general accounting (subprocess of 10729 / 10732) | medium L3 |
| 360, 390 | INS-CLAIMS / BANK-OPS | claim_payment.issued / loan_servicing.posted | Manage financial accounting (10729 L2) | confident L3 |
| 1151, 1152 | UTIL-OPS | meter_billing.computed / customer_bill.posted | Invoice customers (10727 L3) | confident L3 |
| 364, 472, 484, 491 | FUND-ADMIN / MA / various capital markets | nav.computed / mortgage_payment / escrow | Manage financial accounting (10729 L2) at L3 child | medium L3 |
| 495, 497, 516, 526 | RET-STORE / TELCO-BSS | store_close.completed / rated_event.computed | Invoice customers (10727 L3) | confident L3 |
| 542, 551 | HC-PATIENT / PS-LIC | patient_charge.posted / license_fee.collected | Invoice customers (10727 L3) | confident L3 |
| 424, 557, 561 | ESG / GRC / CLM | esg_disclosure / legal_contract financial impact | Manage internal controls (16370 L3) or Manage environmental health and safety (10009 L3) | medium L3 |
| 585, 589, 593, 595 | SUB-MGMT / CPQ | subscription_billing / quote-accepted financial impact | Invoice customers (10727 L3) | confident L3 |
| 635, 670 | TPRM / SAM | vendor_financial_review / license_renewal | Manage suppliers (10280 L3) | medium L3 |
| 876, 879, 889, 885, 863, 864 | INS-CLAIMS / FUND-ADMIN | claim / investor flows | Manage financial accounting (10729 L2) at L3 child | medium L3 |
| 892, 900, 903, 905, 906, 909 | MFG-OPS / INV-MGMT | production / inventory financial postings | Manage inventories (10260 L3) | medium L3 |
| 921, 918, 933, 939, 944, 946 | RET-STORE / FLEET-MAINT / FLEET-MGMT / WORK-MGMT | retail / fleet / cash drop postings | Manage financial accounting (10729 L2) at L3 child | medium L3 |
| 1025 | FSM | service_work_order.invoiced | Invoice customers (10727 L3) | confident L3 |
| 950 | MFG-OPS | scrap.recorded | KEEP existing 822 (Schedule production orders L4); REPLACE because this is COGS posting, not scheduling: Manage inventories (10260 L3) or COGS posting subprocess | confident L4 |
| 419, 956, 958 | FOOD-TRACE / DAIRY-MGMT / FARMER-DIRECT-SALES | commodity / raw milk / direct sale postings | Invoice customers (10727 L3) or Manage inventories (10260 L3) | medium L3 |
| 960, 961, 967, 1166 | LSD / ACCT-PRACT-MGMT / LEGAL-PRACT-MGMT / FMIS | legal cost / professional services / government postings | Manage financial accounting (10729 L2) at L3 child | medium L3 |
| 970, 981, 983, 988 | IWMS / REAL-EST / RE-PROP-MGMT / VET-PRACT-MGMT | lease / patient invoice postings | Invoice customers (10727 L3) or Manage real estate (10778 L3) | medium L3 |
| 1019, 524, 307, 325, 414 | various smaller domains | mixed financial postings | Record general accounting (subprocess) | medium L3 |
| 917, 929, 1015, 1006, 1053, 1054 | additional small-domain inbound | mixed financial postings | Record general accounting (subprocess) | medium L3 |

**Total H1 candidates:** approximately 60 row inserts / replaces. ~15 are REPLACE / REPLACE-tighter candidates (where existing `discovery_*` rows are present); ~45 are INSERT candidates. ~10 are flagged "medium confidence" and may instead route to deferred-to-Discover-Pass-3 (custom-process authoring) if the catalog L3 / L4 children don't carry a close enough match at PCF lookup time.

**Deferred-to-Discover-Pass-3 candidates (no clean PCF cross-industry match):**
- ESG disclosure handoffs (424, 557 if it routes that way) may need a custom `record_esg_financial_impact` process row; PCF cross-industry doesn't carry sustainability-accounting L3 / L4 with sufficient resolution.
- CBAM / carbon-cost specifics (no PCF row exists for carbon-border-adjustment financial postings).

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 + B9 + C1 + B11 + B6/B7/B8 + F2) | 6 (B1-S1, B1-S2, B1-S3, B1-S4, B1-S5, B1-S6) |
| APQC TAGGING (H1) | 1 (B1-S7) |
| MODULARIZATION ISSUES | 0 (route to Bucket 2 since the module set is itself a design conversation; though B1-S1 carries the recommended split as a default) |
| **Bucket 1 total** | **7** items |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #15 notes-pollution on 6 `domain_data_objects` rows.** DDO 145 (`payroll_journal_entries` consumer), 147 (`benefit_enrollments` consumer), 196 (`cost_centers` master), 201 (`fixed_assets` master), 210 (`expense_reports` consumer), 216 (`service_projects` consumer). Notes are descriptive context strings. Were these user-approved at load time, or auto-populated by the loader? | Cannot tell from audit alone; load-time approval status unknown. | (a) Confirm user-approved at load time; leave in place. (b) Confirm auto-populated; PATCH all 6 rows' `notes` to empty string and log the Rule #15 incident in `references/skill-changelog.md`. |
| B2-S2 | **B4 pattern-flag positive re-evaluation per Rule #12.** Every master row currently has all three pattern flags `false`. Proposed updates: `journal_entries.has_submit_lock=true` (posting is one-way), `journal_entries.has_single_approver=true` (controllership approval), `accounting_periods.has_submit_lock=true` (close is one-way), `accounting_periods.has_single_approver=true`, `intercompany_transactions.has_single_approver=true`, `fixed_assets.has_single_approver=true` (capitalization / disposal approval), `revenue_recognition_records.has_submit_lock=true` and `has_single_approver=true`. `has_personal_content` is false on every master (financial ledger entries are not personal data under GDPR / CPRA). | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no from user; capture in Decisions. |
| B2-S3 | **B12 lifecycle states for `general_ledger_accounts` and `cost_centers`.** Both are master-config-shape; the workflow is "active / inactive" plus optional "archived". Per Rule #12 the config-shape exemption is allowed but no longer self-documents in `notes` (Rule #15 supersedes). Surface for the user to confirm: are GL accounts and cost centers config-shape exempt, or do they warrant a (proposed / active / deactivated / archived) state machine? | Workflow-shape judgment. | (a) Config-shape exempt for both; skip B12. (b) Author 4-state machines for both. |
| B2-S4 | **Module set authoring (B1-S1 default).** Audit's default proposal is 6 modules (`ERP-FIN-GL-CLOSE`, `ERP-FIN-AR-BILLING`, `ERP-FIN-AP-DISBURSE`, `ERP-FIN-FIXED-ASSETS`, `ERP-FIN-CASH-BANKING`, `ERP-FIN-REVREC-CONSOL`). The defensible 2-module minimum is `ERP-FIN-GL-CLOSE` + `ERP-FIN-REVREC-CONSOL`. A 4-module variant (GL-CLOSE, FIXED-ASSETS, CASH-BANKING, REVREC-CONSOL) drops the AR / AP modules because OMS / SUB-MGMT own customer-facing billing and AP-AUTO owns supplier-invoice processing. Which split? | Design conversation. | (a) Author 6 modules per the default. (b) Author 4 modules (drop AR-BILLING and AP-DISBURSE). (c) Author 2-module minimum (GL-CLOSE + REVREC-CONSOL). (d) Different split (user proposes). |
| B2-S5 | **B9 event_category convention for `gl_account.created` / `cost_center.created` / `legal_entity.created` / `bank_account.added`.** Audit's default is `lifecycle` for all four (treating master-record-instantiation as a lifecycle event). Alternative is `state_change` (treating instantiation as draft -> active transition). The catalog precedent on `employee.created` is `lifecycle`. | Convention-choice question. | (a) `lifecycle` for all four (preferred per `employee.created` precedent). (b) `state_change` for all four. |
| B2-S6 | **`domains.description` and `business_logic` em-dashes.** Both fields currently carry an em-dash (U+2014) which violates CLAUDE.md. Proposed rewrites: description -> replace "The accounting system of record." after the existing dependent clause with a period (current text has the em-dash as a clause separator and the trailing sentence is fine; the em-dash needs replacing with a colon, comma, or sentence break). `business_logic` -> "Consolidation, allocation, multi-GAAP translation, and period-close orchestration: the regulated calc kernel inside an otherwise transactional ledger." (em-dash replaced with colon). Confirm replacement wording. | Rule #15 demands user-approved wording for any prose changes. | (a) Use the proposed replacements above. (b) Different wording (user supplies). |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran semantic enumeration against SAP S/4HANA Finance, Oracle Fusion Cloud ERP Financials, Workday Financial Management, NetSuite ERP Financials, Microsoft Dynamics 365 Finance, Sage Intacct, Infor CloudSuite Financials, Acumatica Financials, Unit4 ERP, IFS Cloud Financials, Epicor Kinetic Financials, QAD Adaptive Financials. Statutory coverage today on ERP-FIN: 10 regulations (SOX, IFRS, US GAAP, IFRS 17, SEC Climate, TCFD, EU VAT Directive, CBAM, Dodd-Frank, ASC 606). The subagent was not spawned (single-pass audit per orchestrator); candidates below come from the analyst's flagship-vendor knowledge.

#### MISSING entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `chart_of_accounts_segments` | Every flagship ERP (S/4HANA, Oracle Fusion, NetSuite, Workday, D365 Finance) models the chart-of-accounts as a multi-segment structure (Company-Account-Department-Project-IntercompanyPartner) where each segment is a first-class master. Currently `general_ledger_accounts` is monolithic; missing the segment layer below. | ERP-FIN-GL-CLOSE (master) or a separate `ERP-FIN-COA-SEGMENTS` module |
| `tax_codes` / `tax_jurisdictions` | SAP "Tax Code", Oracle "Tax Code / Jurisdiction", D365 Finance "Tax Group". Currently absent on ERP-FIN. Could overlap with a future TAX-MGMT domain. | ERP-FIN-GL-CLOSE (master) with `embedded_master` if TAX-MGMT emerges |
| `currencies` / `exchange_rates` | Multi-currency consolidation depends on these masters. Workday "Currency Conversion Rate", SAP "Exchange Rate Type". Currently absent. Candidates for the catalog-wide master layer (currencies likely cross-domain). | New `currencies` master in catalog-wide module (or ERP-FIN-REVREC-CONSOL with `master` role) |
| `journal_entry_lines` | The flagship ERPs model journal-entry-headers and journal-entry-lines as separate entities; currently `journal_entries` is single-row. Conditional on whether the catalog wants line-level resolution (worth it for IFRS 16 / ASC 842 lease accounting and intercompany line matching). | ERP-FIN-GL-CLOSE (master, child of journal_entries) |
| `allocations` / `allocation_rules` | SAP "Cost Allocation Cycle", Oracle "Allocation Rules", NetSuite "Allocation Schedule". Allocate corporate cost across cost centers, departments, projects. Currently absent. | ERP-FIN-GL-CLOSE (master) or a separate `ERP-FIN-COST-ALLOCATION` module |
| `revaluation_runs` | FX revaluation runs are first-class in S/4HANA and Oracle Fusion. Currently absent (the catalog has `cash_transactions` but no FX-revaluation orchestration). | ERP-FIN-CASH-BANKING (master) |
| `consolidation_units` / `elimination_entries` | Multi-entity consolidation is a first-class workflow in S/4HANA, Oracle Fusion, OneStream. Currently `intercompany_transactions` masters part of this but the consolidation orchestration layer is missing. | ERP-FIN-REVREC-CONSOL (master) |
| `revenue_contracts` / `performance_obligations` | ASC 606 / IFRS 15 require revenue contracts and performance obligations as first-class entities, not just `revenue_recognition_records` (which is currently a single flat shape). | ERP-FIN-REVREC-CONSOL (master), child of `revenue_recognition_records` |

#### MODULARIZATION candidates (already covered as B2-S4 above)

The 6-module / 4-module / 2-module choice is the headline modularization question.

#### Compliance regulation candidates (no entity proposed)

- **CSRD** (Corporate Sustainability Reporting Directive; EU mandatory for large companies from 2026 / 2027 phase-in). Currently the ESG-side disclosure is on ESG domain (21); ERP-FIN should also surface CSRD as it shapes financial-impact disclosures.
- **Pillar Two / Global Minimum Tax** (OECD; minimum 15% effective tax rate; affects multinationals from 2024 onward). Touches ERP-FIN multi-entity consolidation and tax reporting.
- **Lease accounting standards** (ASC 842, IFRS 16) already covered statutorily via US GAAP / IFRS at the framework level; could be added as explicit rows for clarity.

#### Candidate-domain queue

This audit surfaces 0 domain-tier candidates for `audits/_missing-domains.md`. The ERP-FIN core financials market is well-covered; adjacent markets (EPM 66, AP-AUTO 29, EXPENSE 67, SPEND-MGMT 133, OMS 32, SUB-MGMT 97, FUND-ADMIN 160, FMIS 154, ACCT-PRACT-MGMT 152, CAP-TABLE 162, BANK-OPS 43, TAX, TREASURY) are either already in the catalog or are first-class sub-domains within ERP-FIN. The two adjacent markets that could warrant promotion if not already present (TAX-MGMT and TREASURY-MGMT) are absent from the catalog but their headline workflows currently sit inside ERP-FIN (tax_codes, exchange_rates, bank_accounts, cash_transactions). Surface as a future Phase 0 question; do not queue today.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (producing `c:/tmp/ERP-FIN-phase0-<date>.md` with per-entity vendor coverage) or eyeball-mode (user names which of the 8 entity candidates + 3 regulation candidates to treat as confirmed and we proceed via Phase B inserts).

### Cross-bucket dependencies

- **B1-S1 (module set) gates B1-S6 (skill re-anchoring), most of B1-S5 (cross-domain relationships sometimes need module-scoped target FKs), and indirectly every E-band fix.** Resolve B1-S1 first.
- **B2-S4 (module set choice) directly determines B1-S1's actual loader.** User must answer B2-S4 before B1-S1 can land.
- **B1-S2 (event_category) is partially gated by B2-S5 (convention for `*.created` events).** B1-S2 can proceed with `lifecycle` default if B2-S5 is deferred.
- **B2-S1 (Rule #15 notes-pollution) gates whether the 6 DDO rows get reverted.** Independent of all other items.
- **B2-S2 (pattern flags) is independent.**
- **B2-S3 (config-shape vs state-machine for GL accounts / cost centers) gates a small piece of B1-S5 / lifecycle authoring.**
- **B2-S6 (em-dash fix on `domains.description` and `business_logic`) is independent.**
- **B1-S4 (aliases) and B1-S3 (business_function_domains rows) are independent of B1-S1; can run anytime.**
- **B1-S7 (APQC tagging) is independent of B1-S1 (handoffs already exist with NULL module FKs; the PCF tags don't care). Can run anytime.**
- **B3 candidates inform B2-S4 (more entities -> more modules) but are sequenced after Phase 0 verification.**

Buckets 2 and 3 are otherwise independent. Within Bucket 1, the module-set decision (B2-S4 + B1-S1) is the critical path. Everything else can fan out.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S3, S4`), or `skip`.

- **S1 (Author the module set, M1 headline fix)** is the big one; gated on B2-S4 module choice.
- **S2 (PATCH 16 trigger_events to set event_category)** is mechanical; gated marginally on B2-S5.
- **S3 (INSERT 4 `business_function_domains` rows)** is mechanical; needs business-function name lookups.
- **S4 (INSERT approx 25 alias rows)** is mechanical.
- **S5 (INSERT approx 15-20 relationship edges)** is mechanical; some target FKs (`users` edges) are platform_builtin and unchanging.
- **S6 (Re-anchor skill 56 to 6 module-scoped skills, add workflow-bearing tools)** is gated on B1-S1.
- **S7 (Approx 60 APQC tags, mix of REPLACE and INSERT)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** Wait for per-item decisions before acting.

- **B2-S1 (Rule #15 notes-pollution on 6 DDO rows):** confirm auto-populated -> revert all 6, OR confirm user-approved -> leave in place.
- **B2-S2 (pattern flags positive re-evaluation):** per-flag yes/no on the 8 proposed PATCH changes (journal_entries, accounting_periods, intercompany_transactions, fixed_assets, revenue_recognition_records).
- **B2-S3 (GL accounts / cost centers config-shape vs state-machine):** (a) config-shape exempt, (b) author state machines.
- **B2-S4 (module set choice):** (a) 6 modules, (b) 4 modules, (c) 2-module minimum, (d) different.
- **B2-S5 (event_category convention for `*.created` events):** (a) `lifecycle`, (b) `state_change`.
- **B2-S6 (em-dash fix on `domains.description` and `business_logic`):** (a) use proposed replacements, (b) supply different wording.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 8 entity candidates + 3 regulation candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| EPM | Add consumer DMDOs on `journal_entries`, `accounting_periods`, `general_ledger_accounts`, `cost_centers` (4 rows). Populate `source_domain_module_id` on inbounds 599-606 range (EPM-side, where applicable). |
| AUDIT | Add consumer DMDOs on `journal_entries`, `accounting_periods`, `fixed_assets`, `intercompany_transactions`, `cash_transactions`, `legal_entities` (6 rows). Populate `source_domain_module_id` on inbounds where missing. |
| GRC | Add consumer DMDO on `journal_entries`, `accounting_periods`; populate `source_domain_module_id` on inbound. |
| AP-AUTO | Already has bank-accounts-related coverage; populate `source_domain_module_id` on inbounds 125, 126, 191, 192 (5 rows). Confirm AP-AUTO consumes `bank_accounts` as DMDO. |
| PAYROLL | Already populated `source_domain_module_id` on inbound 99 (module 90). Confirm PAYROLL declares `payroll_journal_entries` master (it does, 145). |
| EXPENSE | Populate `source_domain_module_id` on inbound 129. Confirm consumer DMDO `journal_entries` if EXPENSE consumes (probably not, expense_reports posts via ERP-FIN). |
| SPEND-MGMT | Populate `source_domain_module_id` on inbounds 166, 167, 169. |
| PSA | Already populated `source_domain_module_id` on inbounds 1127, 1128 (module 88). Schedule a PSA audit to confirm consumer DMDO `service_projects` reciprocity (ERP-FIN consumes 216). |
| BEN-ADMIN | Populate `source_domain_module_id` on inbound 109. Confirm BEN-ADMIN consumer of `journal_entries` (probably not). |
| OMS | Populate `source_domain_module_id` on inbounds 991, 995. Add consumer DMDOs on `journal_entries` for billing flow. |
| S2P | Populate `source_domain_module_id` on inbounds 213, 991-995 range. |
| SUB-MGMT | Populate `source_domain_module_id` on inbounds. Add consumer DMDOs on `journal_entries` and `revenue_recognition_records` for the subscription billing reciprocity. |
| HCM | Populate `source_domain_module_id` on inbound (HCM is currently a consumer of `cost_centers` 196 via DDO 333 contributor; the routing into ERP-FIN is for terminations triggering cost-center reassignment). Confirm the contributor pattern is correct, or revert to consumer. |
| BANK-OPS / FUND-ADMIN / INS-CLAIMS / TELCO-BSS / UTIL-OPS / HC-PATIENT / PS-LIC / RET-STORE / MFG-OPS / INV-MGMT / PLM | Each has inbound handoffs into ERP-FIN; each needs `source_domain_module_id` populated and consumer DMDOs on `journal_entries` declared. Schedule per-domain b1 audits. |
| FOOD-TRACE / DAIRY-MGMT / FARMER-DIRECT-SALES / IWMS / REAL-EST / RE-PROP-MGMT / VET-PRACT-MGMT / MSP-PSA / FSM / AGENCY-MGMT / ACCT-PRACT-MGMT / FMIS / LEGAL-PRACT-MGMT / LSD / MA | Same pattern: each has inbound; same per-domain audit needed. |
| ESG | Populate `source_domain_module_id` on inbounds 424 and related rows. Confirm ESG-side modeling of `esg_disclosure.published` financial impact. |
| CLM | Populate `source_domain_module_id` on inbound 561 (legal_contract financial impact). |
| TPRM | Populate `source_domain_module_id` on inbound 635. |
| ITAM | Populate `source_domain_module_id` on inbound 632; already 59. Clean. |
| CRM / CPQ / CSM | Populate `source_domain_module_id` on inbounds 503 (CRM-OMS-CPQ chain) where present. |

## 2026-05-31, Continuation: B1 technical fixes

Scoped subagent pass against the 2026-05-30 Validate b1 findings. Applied only items that fit the orchestrator's "purely technical, no judgement" allow-list (enum backfills, audit-pre-specified user-edges, derivable FK PATCHes, naming renames with FK preservation, INSERT-only handoff_processes with resolvable PCF). Everything else deferred to the user.

Loader: [.tmp_deploy/fix_erp_fin_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_erp_fin_b1_technical_2026_05_31.ts). Invoked from project root.

### Fixes applied

| Bucket-1 ID | Action | Count | Verification |
|---|---|---|---|
| B1-S2 | PATCH `trigger_events.event_category` on the 16 ERP-FIN rows the audit named with resolved enum values (`lifecycle` / `state_change` / `signal` per the per-row table in B1-S2). All 16 went from `''` to the audit-specified value. | 16 PATCH | Post-load query `/trigger_events?id=in.(543..558)&event_category=eq.` returns 0 rows. |
| B1-S5 (user-edges only) | INSERT 6 `data_object_relationships` rows from `users` (id 748, `kind='platform_builtin'`) to the ERP-FIN masters the audit pre-specified per Rule #10. Edges: `users creates journal_entries`, `users approves journal_entries`, `users closes accounting_periods`, `users owns legal_entities`, `users approves fixed_assets`, `users reconciles intercompany_transactions`. Pre-existing edge `users owns cost_centers` (id 24) left untouched. All new rows: `relationship_type=one_to_many`, `relationship_kind=reference`, `owner_side=target`, `record_status` omitted so the DB default `new` applies (Rule #1), `notes` omitted so the DB default empty applies (Rule #15). | 6 INSERT | Post-load query returns 6 rows from `users` to the audited masters. |

UI spot-check links:
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/data_object_relationships

### Deferred

| Bucket-1 ID | Why deferred |
|---|---|
| B1-S1 (M1 hard-fail, author module set) | Design conversation gated on **B2-S4** (user picks 6 / 4 / 2-module split). Orchestrator's "no new entities/modules" rule. |
| B1-S3 (4 new `business_function_domains` contributor/consumer rows) | Orchestrator forbids "new business_function_domains contributors/consumers" — user picks the function-spine target rows. |
| B1-S4 (~25 `data_object_aliases` rows) | Not in orchestrator's TECHNICAL allow-list. Several audit-proposed aliases embed vendor-specific terminology (`Company Code` / `Journal Voucher` / `Performance Obligation Records`); per Rule #18, vendor-specific aliases belong on `data_object_aliases` only when authored as `alias_type='solution_term'` with a resolved `solution_id` — a per-alias author decision the user should make. |
| B1-S5 master-to-master intra-domain edges (~9–10 rows) | Orchestrator only licensed user-edges per Rule #10. Master-to-master edges (`journal_entries posted_against accounting_periods` etc.) require verb / cardinality / `owner_side` authoring discretion. |
| B1-S6 (skill 56 re-anchor + add workflow-bearing tools) | Gated on B1-S1 (modules must exist before per-module skills can be authored). Cascades from the deferred module set. |
| B1-S7 (H1 APQC tagging, ~60 candidates) | Audit pre-specifies handoff IDs but only ~5 candidates carry a resolvable `process_id` already in the catalog (320 / 1052 / 1352 / 1382 / 1392). Those existing `handoff_processes` rows sit at `proposal_source='discovery_substring'`; the audit's plan is a "REPLACE with `agent_curated`" upgrade (PATCH the provenance) or DELETE+INSERT a tighter PCF row, neither of which fits the orchestrator's INSERT-only allow-list. The remaining ~55 candidates need PCF lookups (`process_name=ilike.*<term>*`) and confidence calls that aren't pre-resolved in the audit. |
| B2-S1 through B2-S6 | Bucket 2 by construction — user judgment calls. No action this pass. |
| B2-S6 in particular (em-dash on `domains.description` and `business_logic`) | Even though CLAUDE.md forbids em-dashes, both fields are catalog-prose Rule #20 territory and the audit pre-specifies replacement wording that needs user approval before write. Surface this as a follow-up: the two `domains` rows still carry U+2014 characters. |
| Bucket 3 (8 entity candidates + 3 regulation candidates) | Phase-0 vendor research not in scope. |

### Notes for the next pass

- B1-S2 closes B9 enum compliance on every ERP-FIN-owned trigger_event. B9 itself remains partially blocked until B1-S1 is resolved (handoffs still carry NULL module FKs, cf. B10b).
- The 6 new user-edges close B7 (Rule #10 user-edges) on the 6 masters they touch. `cost_centers` had its `users owns cost_centers` edge pre-loaded (id 24); `general_ledger_accounts`, `bank_accounts`, `cash_transactions`, `asset_depreciation_schedules`, and `revenue_recognition_records` were not in the audit's Rule #10 list and remain without user-edges (analyst call: their workflows don't have a single human-actor relationship distinct from the parent master's actor, e.g. depreciation_schedules inherit fixed_assets' approver).
- The loader is idempotent: re-running it skips both PATCHes (event_category already matches) and INSERTs (dedup against the existing edge keys).

## 2026-05-31, Audit

### Summary

Fresh Validate b1 structural pass against live state after the 2026-05-31 Continuation loader. Confirms B9 and partial B7 closed; M1 hard-fail persists and continues to cascade.

- **Current footprint:** 0 `domain_modules` rows (M1 hard-fail). 7 capabilities (GL, AR, AP, FIXED-ASSETS, CLOSE-CONSOL, MULTI-ENTITY, REVENUE-RECOG). 12 solutions (9 primary, 3 secondary). 15 `domain_data_objects` rows (11 masters: 109 revenue_recognition_records, 194 journal_entries, 195 general_ledger_accounts, 196 cost_centers, 197 legal_entities, 198 accounting_periods, 199 bank_accounts, 200 cash_transactions, 201 fixed_assets, 202 asset_depreciation_schedules, 203 intercompany_transactions; 4 consumers: 145 payroll_journal_entries, 147 benefit_enrollments, 210 expense_reports, 216 service_projects). 10 regulations (SOX, IFRS, US GAAP, IFRS 17, SEC Climate, TCFD, EU VAT, CBAM, Dodd-Frank, ASC 606). 19 trigger_events, all 19 now carry valid `event_category` (B1-S2 closed). 3 lifecycle_states (all on 109 revenue_recognition_records). 0 data_object_aliases on the 11 masters. 31 `data_object_relationships` rows touching the masters (incl. the 6 users-edges added 2026-05-31, ids 1520-1525). 16 outbound + 97 inbound = 113 cross-domain handoffs. 1 system skill (id 56 `erp-fin-system`, `domain_module_id=NULL`) with 12 `skill_tools`, all `coverage_tier='platform'`. 1 `business_function_domains` row (Accounting owner). 0 ERP-FIN-prefixed permissions. 66 of 113 handoffs (58%) carry `handoff_processes` tags: 48 `agent_curated`, 15 `discovery_substring`, 3 `discovery_override`; 0 `record_status='approved'`.

- **Bucket 1 (in-scope, agent fixable):** 6 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 11 items (carried).

### Structural bands

- **A1 (domains metadata):** partial-fail. `domains.business_logic` still carries an em-dash (U+2014) violating CLAUDE.md. `description` is clean. Numeric fields populated correctly (crud_percentage=75, min_org_size='20 s <500', cost_band='$$$$$', usa_market_size_usd_m=25000, market_size_source_year=2025).
- **A2 (capabilities):** pass, 7.
- **A3 (solutions):** pass, 12 / 9 primary.
- **M1 (>=1 domain_modules):** HARD-FAIL, 0 rows. Headline structural finding (unchanged from 2026-05-30).
- **M2 (>=2 modules for >=3 capabilities):** vacuous; gates on M1.
- **M4, M5, M6:** vacuous.
- **M7 (single-master integrity):** pass.
- **B1 (>=1 master):** pass, 11.
- **B2 (labels):** pass.
- **B3 (naming arbitration):** pass.
- **B4 (pattern flags positive re-evaluation):** fail. All 11 masters carry `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Audit-time analyst proposes flips on 194 journal_entries (submit_lock + single_approver), 198 accounting_periods (submit_lock + single_approver), 203 intercompany_transactions (single_approver), 201 fixed_assets (single_approver), 109 revenue_recognition_records (submit_lock + single_approver). Carried to B2-S2.
- **B5 (embedded_master integrity):** vacuous (no embedded_master rows on ERP-FIN; cascades from M1).
- **B7 (users edges):** partial-pass. 7 users-edges live (id 24 owns cost_centers pre-existing; ids 1520-1525 added 2026-05-31 covering journal_entries created / approved, accounting_periods closed, legal_entities owned, fixed_assets approved, intercompany_transactions reconciled). 5 masters still without users-edges: 195 general_ledger_accounts, 199 bank_accounts, 200 cash_transactions, 202 asset_depreciation_schedules, 109 revenue_recognition_records. Carried as analyst-call exemption per 2026-05-31 continuation notes (their workflows lack a distinct human-actor relationship), no new agent action.
- **B9 (trigger_events + event_category enum):** pass. All 19 ERP-FIN trigger_events carry a valid `event_category` (lifecycle 8, state_change 8, signal 3). B1-S2 closed via 2026-05-31 PATCH load.
- **B9b (trigger_event uniqueness):** pass, no dupes.
- **B10b (handoffs FK shape):** fail. All 16 outbound carry NULL `source_domain_module_id` AND NULL `target_domain_module_id`. On 97 inbound, 65 have NULL `source_domain_module_id` (owed by source domains, report-only) and 97 have NULL `target_domain_module_id` (in-scope, blocked on M1). Gated entirely on B1-S1.
- **B11 (aliases):** fail. 0 alias rows on any of the 11 masters.
- **B12 (lifecycle states):** fail for 10 of 11 masters. Only 109 revenue_recognition_records has 3 states (pending / recognized / reversed). Missing state machines on 194 journal_entries, 198 accounting_periods, 203 intercompany_transactions, 201 fixed_assets, 200 cash_transactions; 195 general_ledger_accounts and 196 cost_centers candidate-config-shape (B2-S3).
- **C1 (business_function_domains):** partial-fail. Only 1 row (Accounting owner). Missing Finance / FP&A / Tax / Treasury rows per 2026-05-30 audit.
- **E1-E5 (roles + permission bundling):** fail cascade. 0 ERP-FIN-prefixed permissions, 0 `role_modules` rows pointing at ERP-FIN modules. Blocked entirely on M1.
- **F1 (1 system skill per module):** vacuous-fail. The lone skill 56 carries `domain_module_id=NULL` (legacy pre-modular). Rule #17 requires module-anchored. Cascades from M1.
- **F2 (skill_tools shape):** pass on skill 56 (12 valid platform tools: 11 query + 1 send_email side_effect). Will recompute once skill is re-anchored under modules.
- **F3 (operation_kind / data_object_id invariants):** pass (11 query tools all carry a data_object_id; send_email side_effect has NULL data_object_id).
- **F4 (workflow-bearing primitives):** fail. Catalog has no `post_journal_entry`, `close_accounting_period`, `capitalize_fixed_asset`, `recognize_revenue`, `match_intercompany_transactions`, `reconcile_bank_statement` tools. Gated on M1 + B1-S6.
- **F5 (Semantius score):** strict score on the single domain-anchored skill 56 = 100% (12 / 12 platform). Uninformative until F1 is fixed (per-module recompute will land lower once external workflow primitives are authored).
- **H bands (APQC handoff_processes coverage):** partial. Of 113 cross-domain handoffs, 66 (58%) carry tags: 48 `agent_curated`, 15 `discovery_substring`, 3 `discovery_override`. Catalog-quality headline `record_status='approved'`: 0. Process-health side-bar `agent_curated`: 48 (against the H1 target band 57-90 = 0.5N to 0.8N for N=113). 47 handoffs remain untagged. Carried as B1-S7.

### Bucket 1, In-scope confirmed gaps (carried + refreshed)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 hard-fail | 0 `domain_modules` rows; gates B10b, F1, F4, E1-E5, B5. | Author the module set after B2-S4 user choice. Default 6-module proposal carried from 2026-05-30. |
| B1-S3 | C1 sparse business_function_domains | Only Accounting (owner) loaded. Missing Finance / FP&A / Tax / Treasury. | INSERT 4 rows after user names the function-spine targets (orchestrator gate from 2026-05-31 continuation). |
| B1-S4 | B11 aliases missing | 0 aliases on the 11 ERP-FIN masters. | INSERT ~25 alias rows; B2 vendor-term decisions required first (`Journal Voucher` / `Company Code` / `Performance Obligation Records` need `alias_type='solution_term'` + resolved `solution_id` per Rule #18). |
| B1-S5b | B6 / B8 intra and cross-domain master-to-master edges missing | Master-to-master edges deferred from 2026-05-31 (verb / cardinality / `owner_side` authoring discretion). Approx 9-10 rows: journal_entries -> accounting_periods, general_ledger_accounts, cost_centers; journal_entries scoped_by legal_entities; cash_transactions reconciled_against bank_accounts; fixed_assets owned_by legal_entities, governed_by asset_depreciation_schedules; intercompany_transactions between legal_entities; revenue_recognition_records produces journal_entries; accounting_periods scoped_by legal_entities. | INSERT after user confirms verb / cardinality per edge. |
| B1-S6 | F1 / F4 skill re-anchor + workflow primitives | Skill 56 still domain-anchored. Workflow-bearing tools absent. | Gated on B1-S1. After modules exist: author 1 system skill per module, migrate the 12 `skill_tools` rows, add ~10 external workflow primitives (`post_journal_entry`, etc.). |
| B1-S7 | H1 APQC tagging | 47 of 113 handoffs untagged; 0 of 66 tagged rows `record_status='approved'`. | Two passes. (a) INSERT ~37 new agent_curated rows on the untagged handoffs that fit cross-industry PCF; ~10 candidates likely defer to Discover Pass 3. (b) USER approval of the 66 existing tagged rows once reviewed (record_status flip is Rule #1 user-only). |

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 + C1 + B11 + B6 / B8 + F1 / F4) | 5 (B1-S1, B1-S3, B1-S4, B1-S5b, B1-S6) |
| APQC TAGGING (H1) | 1 (B1-S7) |
| Bucket 1 total | 6 |

### Bucket 2, Surface-for-user (judgment calls), carried from 2026-05-30

| ID | Question | Options |
|---|---|---|
| B2-S1 | Rule #15 notes-pollution on ERP-FIN `domain_data_objects` rows (verified 6 at audit time: ids 250 payroll_journal_entries consumer, 261 benefit_enrollments consumer, 324 cost_centers master, 329 fixed_assets master, 351 expense_reports consumer, 358 service_projects consumer). User-approved at load time or auto-populated? | (a) approved; leave. (b) auto; PATCH `notes=''` on all 6 and log incident. |
| B2-S2 | B4 pattern-flag flips on 5 masters. | Per-flag yes / no on journal_entries (submit_lock, single_approver), accounting_periods (submit_lock, single_approver), intercompany_transactions (single_approver), fixed_assets (single_approver), revenue_recognition_records (submit_lock, single_approver). |
| B2-S3 | B12 lifecycle states for `general_ledger_accounts` (195) and `cost_centers` (196). | (a) config-shape exempt. (b) author 4-state machines (proposed / active / deactivated / archived). |
| B2-S4 | Module-set authoring (B1-S1 default). | (a) 6 modules per default. (b) 4 modules (drop AR-BILLING + AP-DISBURSE). (c) 2-module minimum (GL-CLOSE + REVREC-CONSOL). (d) user-supplied. |
| B2-S6 | `domains.business_logic` em-dash fix. Proposed: "Consolidation, allocation, multi-GAAP translation, and period-close orchestration: the regulated calc kernel inside an otherwise transactional ledger." | (a) proposed wording. (b) user-supplied. |

B2-S5 (event_category convention for `*.created` events) from 2026-05-30 is now moot: the agent picked `lifecycle` per the `employee.created` precedent at the 2026-05-31 PATCH, and B1-S2 closed. No carried question.

### Bucket 3, Phase 0 pending (carried from 2026-05-30)

8 entity candidates (`chart_of_accounts_segments`, `tax_codes` / `tax_jurisdictions`, `currencies` / `exchange_rates`, `journal_entry_lines`, `allocations` / `allocation_rules`, `revaluation_runs`, `consolidation_units` / `elimination_entries`, `revenue_contracts` / `performance_obligations`) + 3 regulation candidates (CSRD, OECD Pillar Two, explicit ASC 842 / IFRS 16 rows). Vet via formal Phase 0 vendor research, or eyeball-mode.

### Cross-bucket dependencies

- B2-S4 still gates B1-S1, which still gates B1-S5b, B1-S6, B10b, F1-F4, E1-E5.
- B1-S3 (business_function_domains) and B1-S4 (aliases) and B1-S7 (APQC) independent of M1.
- B2-S1 (notes-pollution) and B2-S6 (em-dash) independent.
- B2-S2 (pattern flags), B2-S3 (config-shape vs state-machine) tied to B12 / Rule #12 but independent of M1.

### Carry-over from 2026-05-30, B1-S2 closed (PATCH 16 trigger_events)

Verified live: all 19 ERP-FIN trigger_events carry valid `event_category`. B9 closed at the enum level; the broader B10b NULL-FK issue on handoffs still cascades from M1.

### Carry-over from 2026-05-30, B1-S5 partial close (6 users-edges)

Verified live: relationship_ids 1520-1525 in place. 6 of 11 masters now carry users-edges; 5 carry the analyst-exempt rationale recorded in 2026-05-31 continuation notes. No further user-edge action required this audit.

### Report-only follow-ups (owed by other domains)

Carried verbatim from 2026-05-30. Each inbound handoff into ERP-FIN with `source_domain_module_id=NULL` owes a PATCH from the source-domain audit; consumer DMDOs on `journal_entries` (and other ERP-FIN masters) owed by every transactional-domain audit. Tracked in those domains' `audits/<DOMAIN>/state.yaml` files, not duplicated here.
