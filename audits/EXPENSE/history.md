# EXPENSE audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 `domain_modules` (M1 hard fail; Phase M never run). 6 masters declared via legacy `domain_data_objects`: `expense_reports` (210), `expense_lines` (211), `corporate_cards` (212), `card_transactions` (213), `expense_policies` (214), `travel_bookings` (215). 1 `embedded_master` on `org_units` (34). 2 `consumer + required` rows on `saas_subscriptions` (62) and `supplier_invoices` (75). 6 capabilities: TIME-TRACKING (shared), EXPENSE-CAPTURE, EXPENSE-POLICY, CORP-CARD, TRAVEL-BOOK, REIMBURSEMENT. Per Rule #14 with 6 capabilities the domain needs at least 2 full `domain_modules`, currently has 0. 14 solutions (5 primary, 7 secondary, 0 partial). 1 `system` skill (`expense-system`, id 57) with `domain_module_id IS NULL` (orphaned per Rule #17). 7 `skill_tools` rows (6 query tools + send_email side_effect). 13 trigger_events (8 with empty `event_category`, B9 partial fail). 17 cross-domain handoffs (11 outbound, 6 inbound). 0 intra-domain handoffs. 0 lifecycle states across all 6 masters (Rule #12 hard fail). 12 aliases. 2 regulations (Sarbanes-Oxley Act, EU VAT Directive). 4 of 17 cross-domain handoffs APQC-tagged (3 `discovery_substring`, 1 `discovery_override`, 0 `agent_curated`, 0 `record_status='approved'`; H1 hard fail).
- **Vendor-surface basis (Pass 2 flagship enumeration):** SAP Concur Expense, Expensify, Brex Expense, Ramp Expense, Emburse Certify, Emburse Chrome River, Rydoo, Pleo, Spendesk, Navan (formerly TripActions, includes Expense), BILL Spend & Expense, Fyle, Zoho Expense, Workday Expenses, Mesh Payments, Airwallex Spend, Center, Mobilexpense, Webexpenses, plus the integrated expense modules inside Oracle NetSuite, SAP S/4HANA Concur Integration, and Coupa Expense. Compliance-specialist coverage anchored on SOX (already loaded), EU VAT Directive (already loaded), IRS Publication 463 (per-diem and substantiation rules, US), HMRC P11D (UK benefits-in-kind), FCPA (US Foreign Corrupt Practices Act, gift / hospitality tracking), GDPR (EEA traveler PII), and PCI-DSS (card-data handling). The current `domain_regulations` set covers SOX + EU VAT only; the broader compliance anchors are surfaced as Bucket 3 candidates.
- **Bucket 1 (in-scope, agent fixable):** 6 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 16 items.

**Neighbor discovery** (auto-derived from cross-domain handoffs + cross-domain `data_object_relationships` + DDO consumers, ranked by edge weight):

| Neighbor | Out | In | DDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| SPEND-MGMT | 3 | 3 | 0 (no DMDO data because no modules) | 4 (`spend_policies` flags `expense_lines`, `travel_bookings`; `spend_policies` syncs_to `expense_policies`; `card_authorizations` upstream of `card_transactions`) | 10 | Pairwise (full) |
| PAYROLL | 1 | 2 | 0 | 1 (`expense_lines` enters `pay_slips`; `pay_runs` disburses `expense_reports` reimbursement) | 4 | Pairwise (full) |
| ERP-FIN | 2 | 0 | 0 | 2 (`expense_reports` posts_to `gl_journal_entries`; `expense_lines` posts_to `gl_journal_entries`) | 4 | Pairwise (full) |
| AP-AUTO | 2 | 0 | 1 (consumer on `supplier_invoices`) | 1 (`expense_reports` becomes `supplier_invoices`) | 4 | Pairwise (full) |
| PSA | 1 | 0 | 0 | 1 (`projects` project T&E rollup from `expense_reports`) | 2 | Pairwise (full) |
| AUDIT | 1 | 0 | 0 | 1 (sample-based audit on `expense_lines` via `compliance_samples`) | 2 | Lightweight |
| SMP | 1 | 0 | 1 (consumer on `saas_subscriptions`) | 0 | 2 | Lightweight |
| HCM | 0 | 1 | 0 | 1 (`employees.terminated` cascades to `corporate_cards`) | 2 | Lightweight |

**Structural pass bands (S1-S3, A1-A3, M1-M7, B1-B12, C1-C2, D1, E1-E6, F1-F5, F7, H1).**

- **S1-S3 (domains row metadata):** PASS. All 7 business-meaningful columns populated (`crud_percentage=90`, `business_logic` non-empty, `min_org_size='20 s <500'`, `cost_band='$$$'`, `certification_required=false`, `usa_market_size_usd_m=3000`, `market_size_source_year=2025`).
- **A1-A3 (capabilities):** PASS positive existence (6 capabilities declared, all linked via `capability_domains`).
- **M1 (every domain has at least one full `domain_modules` row):** **HARD FAIL.** Zero `domain_modules` rows for `domain_id=67`. With 6 capabilities Rule #14 also requires at least 2 full modules. The deployable contract is broken: there is no module to deploy, no module to scope permissions onto, no module to host the `expense-system` skill (Rule #17).
- **M2-M7:** NOT EVALUABLE (no modules to evaluate against). Each becomes a positive check only after Phase M loads.
- **B1-B12 (substrate, DMDO, handoffs, events):** B9 partial fail (8 trigger_events with empty `event_category`). B10b not evaluable in the strict module-FK form (every outbound has `source_domain_module_id=NULL` because EXPENSE has no modules; many inbounds have `target_domain_module_id=NULL` for the same reason). B9b not evaluable (zero intra-domain handoffs, expected once modules exist). B12 (lifecycle states): HARD FAIL, 0 lifecycle states across 6 masters.
- **C1-C2 (regulations):** PASS positive existence (2 regulations linked). C2 wider applicability re-evaluation: Bucket 3 candidates.
- **D1 (data_object_relationships intra-domain coverage):** PASS, the 6 masters are wired through 7 intra-domain composition / reference rows (706-713) plus relations to and from neighbor masters.
- **E1-E6 (roles / permissions):** NOT EVALUABLE without modules (permissions and `role_modules` scope through `domain_module_id`). Positive check pends Phase M.
- **F1-F5, F7 (skills / tools):** F1 PASS positive existence (1 `system` skill). **F2 HARD FAIL** (skill 57 has `domain_module_id IS NULL`, violates Rule #17 invariant "one system skill per domain_modules row" because there is no module). F3 PASS (skill 57 has 7 `skill_tools` rows). F4 positive (operation_kind / data_object_id pairing checks; 6 query tools have `data_object_id` set, 1 send_email side_effect with NULL `data_object_id`). F5 (Semantius score) NOT COMPUTABLE without module attribution. F7 (channel primitive justification) not applicable without sign / external workflows on the skill.
- **H1 (APQC tagging):** **HARD FAIL.** 4 of 17 cross-domain handoffs tagged; 0 `agent_curated`; 0 `record_status='approved'`. Volume expectation 0.5N to 0.8N with N=17 ⇒ 9 to 14 `agent_curated` proposals. The 4 existing tags are 3 `discovery_substring` plus 1 `discovery_override`, all still `record_status='new'`.

EXPENSE Semantius score (strict): **NOT COMPUTABLE** without modules. The structural absence of `domain_modules` rows is the single biggest blocker on this domain: every M / E / F band positive check pends Phase M, and the cross-domain B10b backfill on EXPENSE-side handoff FKs only becomes possible after the modules exist to point at. Phase M is the foundational fix.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard fail (foundational), Phase M never run** | 0 `domain_modules` rows for EXPENSE despite 6 capabilities and 6 masters. The legacy `domain_data_objects` rollup (9 rows) is the only surface declaring entity ownership. Rule #14 requires at least 2 full modules for a 6-capability market. The vendor surface organizes naturally into 3 deployable modules: (a) **EXPENSE-CAPTURE-AND-REPORTING** (masters: `expense_reports`, `expense_lines`, `expense_policies`; embeds `org_units`, `users`; consumes `cost_centers`, `gl_accounts`), (b) **CORP-CARD-RECON** (masters: `corporate_cards`, `card_transactions`; consumes `merchant_codes`, `employees`), (c) **TRAVEL-AND-PER-DIEM** (master: `travel_bookings`; future `traveler_profiles`, `per_diem_rates`; consumes `org_units`, `users`). Alternative shapes are valid (2 modules folding card-recon into capture, or 4 modules splitting policy enforcement into its own module). The audit cannot author the module split without Bucket 2 confirmation, but the M1 hard fail is in-scope to FIX after the split shape lands. | After B2-S1 returns the module split, author 2-4 `domain_modules` rows (`module_kind='full'`); migrate the 9 legacy `domain_data_objects` rows into module-scoped `domain_module_data_objects` rows on the right module per masters; link the `expense-system` skill (57) to one module and split it into per-module system skills if multiple modules land (Rule #17 invariant of one system skill per module). |
| B1-S2 | **B9 partial fail, missing `event_category` on 8 trigger_events** | Per Rule #13 enum: `lifecycle / state_change / threshold / signal`. Affected rows: 568 `expense_line.submitted`, 569 `expense_line.policy_violation`, 570 `expense_line.approved`, 571 `expense_line.posted_to_gl`, 572 `travel_booking.confirmed`, 573 `travel_booking.cancelled`, 574 `travel_booking.out_of_policy`, 575 `corporate_card.issued`, 576 `corporate_card.suspended`. Recount: 9 rows (575 and 576 included). | PATCH: 568 → `state_change`, 569 → `state_change`, 570 → `state_change`, 571 → `lifecycle`, 572 → `state_change`, 573 → `state_change`, 574 → `state_change`, 575 → `lifecycle`, 576 → `state_change`. |
| B1-S3 | **Rule #12 hard fail, 0 lifecycle states across 6 masters** | None of the 6 `master + required` data_objects (210, 211, 212, 213, 214, 215) has any `data_object_lifecycle_states` rows. Rule #12 is unconditional for workflow-bearing masters. The vendor surface implies the following state machines: `expense_reports` (draft → submitted → in_review → approved → posted_to_gl → reimbursed → closed, with rejected branch), `expense_lines` (entered → matched_to_receipt → policy_check → submitted → approved → posted, with violation branch), `corporate_cards` (issued → active → suspended → cancelled), `card_transactions` (posted → matched → expense_line_created → reconciled, with disputed branch), `expense_policies` (draft → active → deprecated), `travel_bookings` (shopped → reserved → confirmed → ticketed → completed → cancelled). | Author 6 state machines (approximately 28-34 rows total) once Phase M lands so each state can carry `domain_module_id`. Gated on B1-S1 because permission materialization (Rule #14) requires the realizing module. |
| B1-S4 | **Rule #17 hard fail, orphan system skill** | Skill 57 `expense-system` has `domain_module_id IS NULL`. Rule #17 invariant: exactly one `system` skill per `domain_modules` row, the skill carries the module FK. With 0 modules the skill is structurally orphaned. After B2-S1 returns the module split, the existing skill is split per module (or attributed to one module if a single-module shape is chosen) and the 7 existing `skill_tools` rows redistribute per module ownership of the queried masters. | Gated on B1-S1 (modules) and B2-S1 (module split). The 7 existing tools split cleanly: `query_expense_reports` / `query_expense_lines` / `query_expense_policies` → EXPENSE-CAPTURE; `query_corporate_cards` / `query_card_transactions` → CORP-CARD-RECON; `query_travel_bookings` → TRAVEL-AND-PER-DIEM; `send_email` ships on all (channel primitive). Additional per-module tools (e.g. `submit_expense_report`, `approve_expense_report`, `reconcile_card_transaction`, `reserve_travel_booking`) author with the lifecycle states. |
| B1-S5 | **B4 pattern flags, blanket false on all 6 masters** | All 6 masters carry `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. The vendor surface flags several positive re-evaluations: (a) `expense_reports.has_personal_content=true` (carries employee name, expense detail, possibly itinerary location data; SOX-relevant for audit trail), (b) `expense_reports.has_submit_lock=true` (once submitted for approval the line set freezes; standard pattern in Concur, Expensify, Workday), (c) `expense_lines.has_submit_lock=true` (frozen post-submit), (d) `travel_bookings.has_personal_content=true` (traveler PII, passport / loyalty / dietary preferences; GDPR-relevant), (e) `card_transactions.has_personal_content=true` (merchant + employee + amount tuple is sensitive; PCI-adjacent), (f) `corporate_cards.has_single_approver=true` (card issuance is a single-manager grant in most platforms), (g) `expense_policies.has_submit_lock=false` (policies are versioned, not locked), (h) `expense_reports.has_single_approver=false` (multi-tier approval is standard for high-value reports). | PATCH 6 `data_objects` rows per the proposed flag set above. Rule #15 forbids auto-populating `data_objects.notes` to explain the flags; surface in chat if a flag's rationale is needed. Gated on Bucket 2 user confirmation of each flag (Bucket 2 item B2-S2 covers the architectural side of cards / transactions; the flag-level call sits in this band). |

#### B10b report-only (asymmetry, owed by other domains plus EXPENSE's own NULLs blocked on B1-S1)

| ID | Finding | Routing |
|---|---|---|
| B1-S6 | **Outbound NULL `source_domain_module_id` on 11 of 11 outbound handoffs** (38, 129, 130, 139, 171, 551, 552, 553, 554, 555, 599). EXPENSE's own side. Cannot fix until B1-S1 lands modules. | In-scope but blocked on B1-S1. Backfill in the same load that creates modules. |
| B1-S7 | **Outbound NULL `target_domain_module_id` on 9 of 11 outbound handoffs** (129, 130, 171, 551, 552, 553, 554, 555, 599). Per B10b asymmetry rule the target module is the target domain's audit work. The 2 outbound rows with target_domain_module_id populated are 38 (SMP module 30) and 139 (PSA module 88). | Report-only routing to ERP-FIN, AP-AUTO, SPEND-MGMT, AUDIT, PAYROLL b1 audits. |
| B1-S8 | **Inbound NULL `source_domain_module_id` on 4 of 6 inbound handoffs** (165 SPEND-MGMT, 559 SPEND-MGMT, 600 SPEND-MGMT, 1157 PAYROLL has source_domain_module_id=90, scratch 1157; 165, 559, 600 with NULL source, plus 468 HCM has source_domain_module_id=54 populated; 101 PAYROLL has source_domain_module_id=93 populated). Re-count: 3 inbounds with NULL source FK (165, 559, 600). All from SPEND-MGMT. | Report-only routing to SPEND-MGMT b1. |
| B1-S9 | **Inbound NULL `target_domain_module_id` on 6 of 6 inbound handoffs** (101, 165, 468, 559, 600, 1157). EXPENSE's own side. Cannot fix until B1-S1. | In-scope but blocked on B1-S1. Backfill in the same load that creates modules. |

#### APQC TAGGING (matches the SKILL anti-pattern: prior EXPENSE phase shipped 4 substring tags and 0 `agent_curated`)

Volume expectation per H1: with N=17 cross-domain handoffs, 9 to 14 `agent_curated` rows. The audit proposes the following candidates from the analyst's structural-pass model. `discovery_substring` rows on 38, 101, 139 and `discovery_override` row on 468 are flagged for REPLACE / confirm action. PCF id column requires lookups at fix time via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry`.

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | Confidence |
|---|---|---|---|---|---|---|
| 38 | EXPENSE → SMP | `card.saas_charge_detected` | `shadow_it_apps` | Manage corporate credit cards (20929 L3, existing substring tag) → REPLACE with "Manage IT asset deployment" or "Manage IT supplier and contract performance" (`apqc_pcf_cross_industry`) | 317 (existing, propose REPLACE) | medium |
| 129 | EXPENSE → ERP-FIN | `expense_report.approved` | `expense_reports` | Process accounts payable (10733 L3 child) or "Process journal entries" (10773.x) | needs PCF lookup | confident L3 |
| 130 | EXPENSE → AP-AUTO | `expense_report.approved` | `expense_reports` | Process accounts payable and expense reimbursements (10733 L2) | 59 | confident L2 |
| 139 | EXPENSE → PSA | `expense.approved` | `expense_reports` | Manage project finances (10773 L3) → REPLACE existing tag (process_id 59 currently points at AP, the project flow is project-finance) | needs PCF lookup | medium |
| 171 | EXPENSE → SPEND-MGMT | `expense_policy.updated` | `expense_policies` | Establish policies and procedures (10743 or child) or "Manage policies and procedures" | needs PCF lookup | medium |
| 551 | EXPENSE → ERP-FIN | `expense_line.posted_to_gl` | `expense_lines` | Process journal entries (10773 L3 child) | needs PCF lookup | confident L3 |
| 552 | EXPENSE → SPEND-MGMT | `expense_line.policy_violation` | `expense_lines` | Manage business unit ethics and compliance (16437 L3) or "Monitor compliance" (10743.x) | needs PCF lookup | medium |
| 553 | EXPENSE → AP-AUTO | `expense_line.approved` | `expense_lines` | Process accounts payable (10733 L2 or L3 child) | needs PCF lookup | confident L3 |
| 554 | EXPENSE → AUDIT | `expense_line.policy_violation` | `expense_lines` | Manage internal controls (10744 L3) or "Audit financial transactions" | needs PCF lookup | confident L3 |
| 555 | EXPENSE → SPEND-MGMT | `travel_booking.out_of_policy` | `travel_bookings` | Monitor compliance with policies (10743.x) | needs PCF lookup | medium |
| 599 | EXPENSE → PAYROLL | `expense_line.approved` | `expense_lines` | Process payroll (10773.x) for in-pay reimbursement, or "Process reimbursements" | needs PCF lookup | confident L3 |
| 165 | SPEND-MGMT → EXPENSE | `card_transaction.posted` | `card_transactions` | Manage corporate credit cards (20929 L3) | needs PCF lookup | confident L3 |
| 101 | PAYROLL → EXPENSE | `expense.reimbursable` | `pay_slips` | Process accounts payable and expense reimbursements (10733 L2, existing substring tag) → CONFIRM with `agent_curated` | 59 (existing, propose REPLACE source) | confident L2 |
| 468 | HCM → EXPENSE | `employee.terminated` | `employees` | Manage employee onboarding, training, and development (20599 L2, existing discovery_override) → REPLACE with "Manage employee separation and retention" or HCM-side off-boarding row | 41 (existing, propose REPLACE) | medium |
| 1157 | PAYROLL → EXPENSE | `pay_run.disbursed` | `expense_reports` | Process payroll disbursements (10773.x) | needs PCF lookup | confident L3 |
| 559 | SPEND-MGMT → EXPENSE | `spend_policy.updated` | `spend_policies` | Establish policies and procedures (10743.x) | needs PCF lookup | medium |
| 600 | SPEND-MGMT → EXPENSE | `card_authorization.declined` | `card_authorizations` | Manage corporate credit cards (20929 L3) or "Authorize transactions" | needs PCF lookup | confident L3 |

17 candidate APQC tags total (1 B1 item per Rule #10's counting convention, B1-H1). The 4 existing `discovery_*` rows are recommended for REPLACE / confirm at fix time; the other 13 are net-new `agent_curated` proposals. UI review is the safety net per Rule #1; all proposals land with `record_status='new'`.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap, in-scope) | 0 (entity candidates all in Bucket 3 pending Phase 0) |
| WRONG-OWNERSHIP | 0 (no modules to route to yet) |
| SCOPE-CREEP | 0 (out-of-domain entities route to Bucket 2 because they depend on the TRAVEL-MGMT / CORP-CARD-PROGRAM candidate-domain decisions) |
| STRUCTURAL (M1 + B9 + Rule #12 + Rule #17 + B4) | 5 (S1, S2, S3, S4, S5) |
| BOUNDARY (NULL FK split by asymmetry) | 0 in-scope today (S6, S9 blocked on S1; S7, S8 are report-only) |
| **APQC TAGGING** | 1 (S1-H1 covering 17 handoffs) |
| MODULARIZATION ISSUES | 0 in Bucket 1 (B2-S1 routes the split decision to Bucket 2) |

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | M1 hard fail, Phase M load (2-4 `domain_modules` rows + DMDO migration from legacy DDO + skill rebind) |
| B1-S2 | PATCH 9 trigger_events to set `event_category` |
| B1-S3 | Author 6 master state machines (gated on B1-S1) |
| B1-S4 | Rebind / split `expense-system` skill per module (gated on B1-S1) |
| B1-S5 | PATCH 6 `data_objects` pattern flags per the proposed positive re-evaluation |
| B1-H1 | APQC TAGGING, propose 13 net-new `agent_curated` rows + REPLACE 4 existing `discovery_*` rows |

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation, edge weight >= 3)

**SPEND-MGMT ↔ EXPENSE (weight 10, heaviest).** Wired pairs: 6 (out 171, 552, 555; in 165, 559, 600). Section 2 (asymmetry NULLs): EXPENSE outbound 171, 552, 555 all have NULL `target_domain_module_id` (SPEND-MGMT's B10b); EXPENSE inbound 165, 559, 600 all have NULL `source_domain_module_id` (SPEND-MGMT's B10b). EXPENSE-side NULL on every row blocked on B1-S1. Section 3 (missing handoffs): a possible missing inbound is SPEND-MGMT → EXPENSE on `vendor_payment.approved` if reimbursement flows through SPEND-MGMT's payment-orchestration. Section 4 (boundary integrity): the overlap of `expense_policies` (214, EXPENSE master) with `spend_policies` (747, SPEND-MGMT master) is the real boundary question, the `syncs_to` relationship (733) declares them as parallel masters but the vendor surface (Brex, Ramp, Pleo, Navan) increasingly collapses them into a single policy entity. This is an architectural conversation, B2-S5. Section 5 (cross-rel mirror): `expense_lines flags spend_policies` (731), `travel_bookings flags spend_policies` (732), `expense_policies syncs_to spend_policies` (733) all present. The `card_authorizations` → `card_transactions` upstream relationship exists implicitly via handoff 600 but no cross-rel row is loaded.

**PAYROLL ↔ EXPENSE (weight 4).** Wired pairs: 3 (out 599; in 101, 1157). Section 2: 599 has NULL target_domain_module_id (PAYROLL's B10b); 101 / 1157 have NULL target on EXPENSE side (blocked on B1-S1). Section 3: clean (the in-pay-reimbursement and post-pay-reimbursement paths are both wired). Section 4: clean. Section 5: `expense_lines enters pay_slips` (726) exists. The `pay_runs disburses expense_reports` relationship is implicit via handoff 1157 but no cross-rel row.

**ERP-FIN ↔ EXPENSE (weight 4).** Wired pairs: 2 (out 129, 551). Section 2: both have NULL target (ERP-FIN's B10b). Section 3: missing inbound from ERP-FIN to EXPENSE on `gl_period.closed` if EXPENSE should freeze open reports at period close. Section 4: clean. Section 5: `expense_reports posts_to gl_journal_entries` (728), `expense_lines posts_to gl_journal_entries` (729) exist.

**AP-AUTO ↔ EXPENSE (weight 4).** Wired pairs: 2 (out 130, 553). Section 2: both have NULL target (AP-AUTO's B10b). Section 3: missing inbound from AP-AUTO if reimbursement-payment-cleared events should ping EXPENSE; this depends on whether EXPENSE holds the reimbursement record or AP-AUTO does (Bucket 2 question B2-S6). Section 4: the consumer DDO on `supplier_invoices` (75) declares EXPENSE depends on AP-AUTO for reimbursement-as-invoice; the `expense_reports becomes supplier_invoices` (725) cross-rel confirms. Section 5: 725 present.

**PSA ↔ EXPENSE (weight 2, but pairwise per orchestration).** Wired pairs: 1 (out 139, target_domain_module_id=88 PSA-PROJECT-DELIVERY populated). Section 2: clean. Section 3: missing inbound from PSA on `project.closed` to freeze EXPENSE T&E rollups. Section 4: clean. Section 5: `projects project T&E rollup from expense_reports` (730) exists.

**Lighter neighbors (1-2 weight, one-line summaries):**

- **AUDIT ↔ EXPENSE (weight 2).** Outbound 554 has NULL target (AUDIT's B10b). The `compliance_samples samples expense_lines` (347) cross-rel exists; sample-based audit is the model.
- **SMP ↔ EXPENSE (weight 2).** Outbound 38 has target_domain_module_id=30 populated; source NULL on EXPENSE side (blocked on B1-S1). DDO consumer on `saas_subscriptions` (62) declares EXPENSE depends on SMP for shadow-IT detection via card transactions. The `saas_subscriptions charged_to_subscription expense_lines` (714) cross-rel exists.
- **HCM ↔ EXPENSE (weight 2).** Inbound 468 has source populated to module 54; target NULL on EXPENSE side. The `employees triggers corporate_cards` (48) cross-rel exists for card-cancellation cascade.

**In-scope mechanical PATCHes derived from pairwise:**

None this pass. Every pairwise NULL FK on EXPENSE's side (target on outbound, source on inbound) is blocked on B1-S1 because the module the FK points at doesn't exist yet. The neighbor side NULLs route as report-only to those domains' audits.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **EXPENSE module split shape.** B1-S1 fixes the M1 hard fail by authoring `domain_modules` rows, but the split itself is architectural. Three plausible shapes: (a) 3 modules: EXPENSE-CAPTURE-AND-REPORTING / CORP-CARD-RECON / TRAVEL-AND-PER-DIEM (matches vendor surface, leaves room for the CORP-CARD-PROGRAM candidate-domain promotion to migrate cards out); (b) 2 modules: EXPENSE-MGMT (masters: reports, lines, policies, cards, transactions) / TRAVEL-INTEGRATION (master: travel_bookings) (collapses card recon into the main expense module, typical for Expensify / Concur core); (c) 4 modules: EXPENSE-CAPTURE / EXPENSE-POLICY-AND-AUDIT / CORP-CARD-RECON / TRAVEL-INTEGRATION (splits policy enforcement; matches Workday's Spend Mgmt taxonomy). Recommendation: (a) 3 modules because it cleanly survives the CORP-CARD-PROGRAM promotion (Bucket 3) and leaves TRAVEL-AND-PER-DIEM positioned to host the TRAVEL-MGMT candidate-domain decision. | Module split is the architectural backbone every other fix depends on. User owns the call. | (a) 3 modules per recommendation. (b) 2 modules. (c) 4 modules. (d) Custom split (specify per-module masters). |
| B2-S2 | **Does EXPENSE own `corporate_cards` and `card_transactions`, or should they migrate to a future CORP-CARD-PROGRAM domain?** The vendor surface splits cleanly: Brex / Ramp / Marqeta / Stripe Issuing model card issuance and program management as a separate market from expense reporting (KYB underwriting, BIN sponsorship, dispute / chargeback handling), while Concur / Expensify / Workday Expenses consume corporate-card feeds as an upstream signal. CORP-CARD-PROGRAM is queued in `audits/_missing-domains.md` (mention_count now 2 after this audit). If promoted, the `corporate_cards` and `card_transactions` masters migrate to CORP-CARD-PROGRAM and EXPENSE consumes them via inbound handoff. If folded into EXPENSE, the current ownership stays. | Architectural call gated on the candidate-domain triage in `audits/_missing-domains.md`. Has Bucket 3 dependency. | (a) Keep both masters in EXPENSE (current state, simple). (b) Migrate both to CORP-CARD-PROGRAM after promotion (deferred until that domain lands). (c) Split: keep `corporate_cards` (card management as employee benefit) in EXPENSE, migrate `card_transactions` to CORP-CARD-PROGRAM as the ledger primitive. |
| B2-S3 | **Does EXPENSE own `travel_bookings`, or should it migrate to TRAVEL-MGMT?** Same shape as B2-S2. TRAVEL-MGMT is queued (mention_count now 2 after this audit). Vendor surface: Navan, Egencia, SAP Concur Travel, Spotnana model travel-booking as a distinct market (GDS integration, itinerary management, traveler safety / duty-of-care, hotel and air sourcing). Concur historically bundled travel + expense; Navan bundles travel + expense + card; pure-play expense vendors (Expensify, Rydoo) consume travel as an external feed. | Same dependency shape as B2-S2. Has Bucket 3 dependency. | (a) Keep `travel_bookings` in EXPENSE. (b) Migrate to TRAVEL-MGMT after promotion. (c) Keep but author thin (`travel_bookings` as integration record only, TRAVEL-MGMT owns the rich master). |
| B2-S4 | **B4 pattern-flag specific calls.** B1-S5 proposes 8 flag flips. Per Rule #15 the audit cannot author the flag-rationale text into `data_objects.notes`. Per-flag confirmation needed: (a) `expense_reports.has_personal_content=true` (employee + line detail, SOX-audit-trail), (b) `expense_reports.has_submit_lock=true` (frozen post-submit), (c) `expense_lines.has_submit_lock=true` (frozen post-submit), (d) `travel_bookings.has_personal_content=true` (GDPR traveler PII), (e) `card_transactions.has_personal_content=true` (PCI-adjacent), (f) `corporate_cards.has_single_approver=true` (single-manager grant), (g) `expense_reports.has_single_approver=false` (multi-tier), (h) `expense_policies.has_submit_lock=false` (versioned). | Workflow-shape judgments the user owns. | Per-flag yes / no captured in Decisions. |
| B2-S5 | **`expense_policies` (214) vs `spend_policies` (747) overlap.** SPEND-MGMT is the heaviest neighbor (weight 10). The `syncs_to` cross-rel (733) declares them as parallel masters that mirror each other, but the vendor surface (Brex, Ramp, Pleo, Navan, Volopay) increasingly ships a single policy primitive that drives both card limits (SPEND-MGMT side) and expense-report acceptance (EXPENSE side). Three resolutions: (a) Keep the parallel-master shape (mirror via sync), (b) Collapse to a single `expense_policies` master in EXPENSE with SPEND-MGMT consuming it, (c) Collapse to `spend_policies` in SPEND-MGMT with EXPENSE consuming it. | Cross-domain architectural decision touching two domains' module shapes. | One of (a) / (b) / (c). |
| B2-S6 | **Where does the reimbursement disbursement record live?** EXPENSE consumes `supplier_invoices` (75) per the legacy DDO, and `expense_reports becomes supplier_invoices` (725) declares the post-approval handoff to AP-AUTO. But the `expense.reimbursable` inbound from PAYROLL (101) and `pay_run.disbursed` inbound from PAYROLL (1157) both target `expense_reports`. Two reimbursement paths exist: (i) PAYROLL-side (in-pay reimbursement, common in US small / mid-market), (ii) AP-AUTO-side (off-cycle bank payment, common in larger orgs with full AP automation). Question: does EXPENSE expect to model both, or pick one canonical path? | Workflow scope decision. | (a) Model both paths (current implicit state). (b) Pick PAYROLL-side, deprecate the AP-AUTO consumer. (c) Pick AP-AUTO-side, deprecate the PAYROLL handoffs. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against SAP Concur Expense, Expensify, Brex Expense, Ramp Expense, Emburse Certify, Emburse Chrome River, Rydoo, Pleo Expenses, Soldo, Volopay, Fyle, Tipalti Expenses, Spendesk, Zoho Expense, Mesh, Center, Mobilexpense, Webexpenses, Workday Expenses, Navan, Airwallex Spend, BILL Spend & Expense, plus the embedded expense modules inside Oracle NetSuite, SAP S/4HANA, Coupa Expense. The compliance anchor set extends beyond SOX + EU VAT to IRS Publication 463 (per-diem substantiation), HMRC P11D (UK benefits-in-kind), FCPA (US Foreign Corrupt Practices Act, gift / hospitality), GDPR (EEA traveler PII), and PCI-DSS (card-data handling). Each candidate below is sourced from flagship-vendor knowledge, not vetted Phase 0 vendor research. Verification path: formal Phase 0 spawn against the EXPENSE domain or eyeball-mode triage.

#### MISSING (10) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module (after B2-S1) |
|---|---|---|
| `receipts` | Concur, Expensify, Rydoo, Fyle, Pleo all model the receipt image / extracted text as a first-class master distinct from `expense_lines` (one receipt can split into N lines; receipts have their own lifecycle: captured → OCR'd → matched → archived). Current shape folds receipts into expense_lines. | EXPENSE-CAPTURE-AND-REPORTING (master) |
| `mileage_logs` | Concur Drive, Expensify, MileIQ, Cardata model mileage as a distinct master with GPS tracks, start / end points, business-purpose categorization. Currently absent. | EXPENSE-CAPTURE-AND-REPORTING (master) or TRAVEL-AND-PER-DIEM |
| `per_diem_rates` | Concur, Workday Expenses, GSA per-diem feed, FOREIGNGOV / OCONUS rate tables. Currently absent. | TRAVEL-AND-PER-DIEM (master), reference data |
| `cash_advances` | Concur, Workday Expenses, Emburse Chrome River model cash advances as a distinct master with issue / reconciliation / settlement lifecycle. Currently absent. | EXPENSE-CAPTURE-AND-REPORTING (master) |
| `expense_categories` | Every vendor has a category taxonomy distinct from the policy entity (meals, lodging, ground transport, supplies, etc.) often mapped to GL accounts. Currently inlined onto `expense_lines`. | EXPENSE-CAPTURE-AND-REPORTING (reference master) |
| `traveler_profiles` | Navan, Egencia, Concur Travel, Spotnana model traveler profiles as a distinct master with passport / loyalty / dietary preferences / TSA-precheck. Currently absent. | TRAVEL-AND-PER-DIEM (master) or move with travel migration |
| `policy_violations` | Concur, Expensify, Brex, Ramp model violations as a distinct master separate from `expense_lines` (one line can carry multiple violations; violations have their own resolution lifecycle: flagged → reviewed → exception_granted / line_corrected). Currently violations are implicit on `expense_line.policy_violation` events. | EXPENSE-CAPTURE-AND-REPORTING or EXPENSE-POLICY-AND-AUDIT |
| `delegate_authorizations` | Concur, Workday, Expensify all model proxy / delegate permissions (employee A submits on behalf of employee B; manager A approves on behalf of manager B during PTO). Currently absent. | EXPENSE-CAPTURE-AND-REPORTING (junction master) |
| `vat_tax_records` | Concur Tax Assurance, VATBox, Vatglobal handle VAT extraction and recovery as a distinct record-type with reclaim lifecycle. EU VAT directive (already loaded) is the anchor. Currently absent. | EXPENSE-POLICY-AND-AUDIT (master) or new EXPENSE-VAT module |
| `audit_trail_records` | SOX / IRS substantiation needs immutable audit-trail records distinct from the expense-line state machine (who edited, who viewed, who approved, with timestamps). Currently absent as a queryable entity, though implicit in `record_status` columns. | EXPENSE-POLICY-AND-AUDIT (master) |

#### MODULARIZATION (2) candidates

- **TRAVEL-AND-PER-DIEM may warrant promotion to TRAVEL-MGMT domain.** If B2-S3 returns "migrate to TRAVEL-MGMT", the TRAVEL-AND-PER-DIEM module empties out and either retires or becomes a thin integration module. The TRAVEL-MGMT candidate is queued and mention-counted at 2 after this audit.
- **CORP-CARD-RECON may warrant promotion to CORP-CARD-PROGRAM domain.** If B2-S2 returns "migrate cards", the CORP-CARD-RECON module either retires (cards fully owned by CORP-CARD-PROGRAM) or shrinks to a thin consumer (EXPENSE only reads transactions). The CORP-CARD-PROGRAM candidate is queued and mention-counted at 2 after this audit.

#### Compliance regulation candidates (4)

- **IRS Publication 463** applicability (mandatory for US employer per-diem and substantiation rules; underpins `per_diem_rates` and `cash_advances` masters).
- **HMRC P11D** applicability (mandatory for UK employer benefits-in-kind reporting; affects which expense categories require reporting).
- **FCPA (Foreign Corrupt Practices Act)** applicability (mandatory for US-listed entities and foreign subsidiaries; gift / hospitality / travel-with-foreign-officials tracking).
- **GDPR** applicability (mandatory for EEA traveler PII handling in `traveler_profiles` and `travel_bookings`).
- **PCI-DSS** applicability (mandatory if EXPENSE ever stores PAN or full card numbers; usually scoped out by tokenization at the CORP-CARD-PROGRAM tier but flagged for completeness).

Recount: 5 regulation candidates (IRS 463, HMRC P11D, FCPA, GDPR, PCI-DSS). The Bucket 3 total below uses 5.

#### Candidate-domain queue

This audit surfaced 3 entries for `audits/_missing-domains.md`:

- **TRAVEL-MGMT** (bumped, mention_count 1 → 2): Navan, Egencia, SAP Concur Travel, TripActions, Spotnana, AmTrav. Adjacency EXPENSE, SPEND-MGMT, HCM.
- **CORP-CARD-PROGRAM** (bumped, mention_count 1 → 2): Marqeta, Stripe Issuing, Highnote, Lithic, Brex Card, Ramp Card. Adjacency EXPENSE, SPEND-MGMT, ERP-FIN, AP-AUTO.
- **RECEIPT-CAPTURE-OCR** (new, mention_count 1): Veryfi, Taggun, Rossum, Klippa, AWS Textract, Google Document AI. Adjacency EXPENSE, AP-AUTO, RPA-OCR. This is the OCR / extraction layer vendors that the receipts master could consume; may also rejected as a feature rather than a domain at triage (see Rule #2 point-solution test).

#### Bucket 3 count summary

| Subtype | Count |
|---|---|
| MISSING entity candidates | 10 |
| MODULARIZATION candidates | 2 |
| Regulation candidates | 5 |
| **Bucket 3 total** | 17 (rounded down for the count cited in the Summary; deviation noted: the Summary's 16 omits PCI-DSS as a low-confidence add. Treat 16 or 17 as equivalent open; per Rule #10 frontmatter open_questions = B1 + B2 + B3 = 6 + 6 + 16 = 28.) |

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces `c:/tmp/EXPENSE-phase0-<date>.md` with per-entity vendor coverage matrices) or eyeball-mode (user names which of the 10 entities + 2 modularization + 5 regulations to treat as confirmed). Candidate-domain promotion (TRAVEL-MGMT, CORP-CARD-PROGRAM, RECEIPT-CAPTURE-OCR) is independent of this audit's eyeball path, runs via the triage cycle in `audits/_missing-domains.md`.

### Cross-bucket dependencies

- **B1-S3, B1-S4, B1-S5 are gated on B1-S1** (modules must exist before lifecycle states can carry `domain_module_id`, before the skill can rebind, before pattern flags can be re-evaluated with module context). B1-S2 (event_category PATCH) is independent.
- **B1-S1 itself is gated on B2-S1** (the module split shape is the architectural input the loader needs).
- **B2-S2 and B2-S3 have Bucket 3 dependencies**: the migration decisions to CORP-CARD-PROGRAM and TRAVEL-MGMT respectively are gated on the candidate-domain triage outcomes in `audits/_missing-domains.md`. If the user chooses to defer those decisions, B1-S1 can proceed under the assumption "EXPENSE keeps both, migrate later", which is the recommended path (the migration is non-destructive if module ownership is well-defined).
- **B2-S5 (expense_policies vs spend_policies overlap)** is independent of all other buckets in this audit but creates work for the SPEND-MGMT b1 audit when it runs.
- **B2-S6 (reimbursement disbursement path)** is independent of all other items.
- **B2-S4 (pattern flag specifics)** depends on B2-S2 and B2-S3 for `corporate_cards`, `card_transactions`, `travel_bookings`. If those masters migrate out of EXPENSE, the relevant flag flips move with them.
- **B1-H1 (APQC tagging) is independent** of the modular fixes (handoff_processes rows attach to handoffs, not modules). Can run before B1-S1.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S5, H1`), or `skip`.

- **S1 (M1 hard fail, Phase M load)** is the foundational fix but gated on B2-S1 architectural choice. Once B2-S1 returns the split, B1-S1 loader becomes deterministic.
- **S2 (event_category PATCH on 9 events)** is trivial; one PATCH each. Independent of all other items.
- **S3 (6 master state machines)** depends on S1.
- **S4 (skill rebind)** depends on S1.
- **S5 (8 pattern flag flips)** depends on B2-S4 confirmation per flag.
- **H1 (17 APQC tags including 4 REPLACE candidates)** load now or in a follow-up batch? Independent of S1-S5.

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (module split):** (a) 3 modules per recommendation, (b) 2 modules, (c) 4 modules, (d) custom.
- **B2-S2 (corporate_cards / card_transactions ownership):** (a) keep both in EXPENSE, (b) defer to CORP-CARD-PROGRAM promotion, (c) split (cards in EXPENSE, transactions in CORP-CARD-PROGRAM).
- **B2-S3 (travel_bookings ownership):** (a) keep in EXPENSE, (b) defer to TRAVEL-MGMT promotion, (c) thin-integration shape.
- **B2-S4 (pattern flag specifics):** per-flag yes / no on the 8 proposed flips.
- **B2-S5 (expense_policies vs spend_policies):** (a) keep parallel + sync, (b) collapse to EXPENSE, (c) collapse to SPEND-MGMT.
- **B2-S6 (reimbursement path):** (a) model both, (b) PAYROLL-side canonical, (c) AP-AUTO-side canonical.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 10 entities + 2 modularization + 5 regulations to treat as confirmed. Candidate-domain triage (TRAVEL-MGMT, CORP-CARD-PROGRAM, RECEIPT-CAPTURE-OCR) is a separate cycle in `audits/_missing-domains.md`.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| SPEND-MGMT | B10b: populate `target_domain_module_id` on inbound handoffs 171, 552, 555 (EXPENSE outbound, SPEND-MGMT receiving); populate `source_domain_module_id` on inbound handoffs 165, 559, 600 (SPEND-MGMT outbound, EXPENSE receiving). Decide policy-mastering shape per B2-S5 in concert with EXPENSE. Confirm `card_authorizations` cross-rel needs a new row to `card_transactions`. |
| PAYROLL | B10b: populate `target_domain_module_id` on outbound 599 (EXPENSE → PAYROLL `expense_line.approved`). Confirm `pay_runs disburses expense_reports` warrants a cross-rel row to complement handoff 1157. |
| ERP-FIN | B10b: populate `target_domain_module_id` on 129, 551 (EXPENSE → ERP-FIN). Consider authoring inbound `gl_period.closed` → EXPENSE for period-close enforcement. |
| AP-AUTO | B10b: populate `target_domain_module_id` on 130, 553 (EXPENSE → AP-AUTO). Decide reimbursement-vs-disbursement boundary per B2-S6. |
| PSA | Confirm 139 target_domain_module_id=88 is the intended PSA module. Consider authoring inbound `project.closed` → EXPENSE to freeze T&E rollups. |
| AUDIT | B10b: populate `target_domain_module_id` on 554 (EXPENSE → AUDIT `expense_line.policy_violation`). |
| SMP | B10b: confirm target_domain_module_id=30 on 38 is the intended SMP module. The shadow-IT card-charge detection flow is the canonical inbound. |
| HCM | Confirm source_domain_module_id=54 on 468 is the intended HCM module. The `employee.terminated` cascade to `corporate_cards` is the canonical outbound. |

### Decisions

_(empty until reviewed; per-bucket decisions captured as the user makes them.)_

## 2026-05-31, Continuation: B1 technical fixes

### Scope of this continuation

Subagent pass on truly-technical Bucket-1 fixes for EXPENSE. Inventory of 6 B1 items from the 2026-05-30 audit (S1, S2, S3, S4, S5, H1). Only B1-S2 qualified as technical; the other 5 were deferred per the prompt's classification rules.

### Applied

- **B1-S2 PATCH trigger_events.event_category on 9 rows.** Loader: [.tmp_deploy/fix_expense_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_expense_b1_technical_2026_05_31.ts). All 9 rows verified pre-flight at `event_category=''`, all 9 patched successfully and verified post-flight. Mapping per audit:
  - 568 expense_line.submitted -> `state_change`
  - 569 expense_line.policy_violation -> `state_change`
  - 570 expense_line.approved -> `state_change`
  - 571 expense_line.posted_to_gl -> `lifecycle`
  - 572 travel_booking.confirmed -> `state_change`
  - 573 travel_booking.cancelled -> `state_change`
  - 574 travel_booking.out_of_policy -> `state_change`
  - 575 corporate_card.issued -> `lifecycle`
  - 576 corporate_card.suspended -> `state_change`

### Deferred

- **B1-S1 (M1 hard fail, Phase M load).** Creates 2-4 new `domain_modules` rows + DMDO migration; gated on B2-S1 module-split decision (user picks 3 / 2 / 4 / custom). Prompt rules: new modules, "user picks" decisions, and full Phase M loads are deferred.
- **B1-S3 (6 master state machines).** Creates new `data_object_lifecycle_states` rows; gated on B1-S1 because state rows carry `domain_module_id`. Prompt rules: new entities deferred.
- **B1-S4 (skill rebind / split).** Gated on B1-S1; the module split shape determines whether one or N system skills.
- **B1-S5 (6 pattern flag flips on data_objects).** Gated on B2-S4 per-flag user confirmation. Prompt rules: "pattern flag flips" explicitly deferred.
- **B1-H1 (17 APQC handoff_processes tags).** 13 of the 17 candidates carry "needs PCF lookup" in the audit, no resolvable PCF id pre-specified. The 4 with pre-specified ids (38->317, 130->59, 101->59, 468->41) are REPLACE / CONFIRM operations against existing `discovery_*` rows, not pure INSERTs. Prompt rule allows INSERT `handoff_processes` only when the audit pre-specifies `handoff_id` + a resolvable PCF; REPLACE / PATCH semantics for `handoff_processes` are out of scope for this continuation.
- **B1-S6, B1-S9 (EXPENSE-side B10b NULL FK backfills).** Audit explicitly marks both as "blocked on B1-S1" because the modules to point at do not exist yet.
- **B1-S7, B1-S8 (neighbor-owed NULL FK backfills).** Report-only; routed to SPEND-MGMT, ERP-FIN, AP-AUTO, PAYROLL, AUDIT, SMP, HCM audits. Not in scope here.

### Counts

- Technical fixes applied: 1 of 6 B1 items (9 PATCH operations).
- Deferred: 5 of 6 B1 items.
- JWT errors: 0.

### Loader

- [.tmp_deploy/fix_expense_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_expense_b1_technical_2026_05_31.ts) (idempotent; safe to re-run).

## 2026-05-31, Audit

### Summary

- **Current footprint:** 0 `domain_modules` rows (M1 hard fail unchanged from 2026-05-30). 6 masters: 210 expense_reports, 211 expense_lines, 212 corporate_cards, 213 card_transactions, 214 expense_policies, 215 travel_bookings. 1 `embedded_master` on 34 org_units. 2 `consumer + required` on 62 saas_subscriptions and 75 supplier_invoices. 6 capabilities (TIME-TRACKING shared, EXPENSE-CAPTURE, EXPENSE-POLICY, CORP-CARD, TRAVEL-BOOK, REIMBURSEMENT). 14 solutions (5 primary, 9 secondary). 1 `system` skill (57 `expense-system`, `domain_module_id IS NULL`, orphan per Rule #17). 7 `skill_tools` rows. **13 trigger_events all populated** with `event_category` (B9 PASS, was 9 empties on 2026-05-30, resolved by [.tmp_deploy/fix_expense_b1_technical_2026_05_31.ts](../../.tmp_deploy/fix_expense_b1_technical_2026_05_31.ts)). 0 lifecycle states across 6 masters (B12 unchanged hard fail). 12 aliases (B11 PASS). 2 regulations (Sarbanes-Oxley Act, EU VAT Directive). 17 cross-domain handoffs (11 outbound, 6 inbound), 0 intra-domain. **APQC tags: 7 of 17 tagged** (3 `discovery_substring` on 38, 101, 139; 1 `discovery_override` on 468; 3 `agent_curated` on 130, 553, 554; all `record_status='new'`, 0 approved). H1 still hard fail on `record_status='approved'` count, but 3 net-new `agent_curated` rows since 2026-05-30 (130 to PCF 1445, 553 to PCF 1445, 554 to PCF 1433).
- **Vendor-surface basis:** unchanged from 2026-05-30. SAP Concur, Expensify, Brex, Ramp, Emburse Certify, Chrome River, Rydoo, Pleo, Spendesk, Navan, BILL Spend, Fyle, Zoho Expense, Workday Expenses, Mesh, Airwallex, Center, Mobilexpense, Webexpenses, plus embedded expense modules inside Oracle NetSuite, SAP S/4HANA, Coupa Expense. Compliance anchors SOX, EU VAT, IRS 463, HMRC P11D, FCPA, GDPR, PCI-DSS.
- **Bucket 1 (in-scope, agent fixable):** 6 items (1 resolved since 2026-05-30 via continuation, 4 carried forward, 1 new A4, plus H1 partial).
- **Bucket 2 (surface-for-user, judgment):** 7 items (6 carried forward, 1 new for em-dash in `domains.business_logic`).
- **Bucket 3 (Phase 0 pending, speculative):** 17 items (unchanged from prior audit).

### Bands re-run

| Band | 2026-05-30 | 2026-05-31 | Change |
|---|---|---|---|
| S1-S3 | PASS | PASS | unchanged |
| A1-A3 | PASS | PASS | unchanged |
| A4 (catalog UX) | not surfaced | **HARD FAIL** | `catalog_tagline` and `catalog_description` both empty strings |
| M1 | HARD FAIL | HARD FAIL | unchanged (0 modules) |
| M2-M7 | NOT EVALUABLE | NOT EVALUABLE | gated on M1 |
| M8 | NOT EVALUABLE | NOT EVALUABLE | gated on M1 |
| B9 (event_category) | partial fail (9 empties) | **PASS** | resolved by 2026-05-31 continuation |
| B11 (aliases) | PASS | PASS | unchanged (12 aliases across 6 masters) |
| B12 (lifecycle states) | HARD FAIL | HARD FAIL | unchanged (0 states) |
| C1-C2 | PASS | PASS | unchanged |
| D1 (intra-domain rels) | PASS | PASS | 30 relationships, including 7 intra-domain composition / reference edges (706-713) plus 7 `users` (748) edges (716-723) |
| E1-E6 | NOT EVALUABLE | NOT EVALUABLE | gated on M1 |
| F1 | PASS | PASS | 1 system skill |
| F2 | HARD FAIL | HARD FAIL | skill 57 `domain_module_id IS NULL` |
| F3 | PASS | PASS | 7 `skill_tools` |
| F4 | PASS | PASS | operation_kind / data_object_id pairing valid |
| F5 | NOT COMPUTABLE | NOT COMPUTABLE | gated on F2 |
| H1 (APQC) | HARD FAIL (4 of 17 tagged) | HARD FAIL (7 of 17 tagged, 3 net-new `agent_curated`, 0 approved) | partial progress |

### Bucket 1, In-scope confirmed gaps (this audit)

| ID | Band | Finding | Fix surface |
|---|---|---|---|
| B1-S1 | M1 hard fail, foundational | 0 `domain_modules` for domain 67. Recommended 3-module split (EXPENSE-CAPTURE-AND-REPORTING, CORP-CARD-RECON, TRAVEL-AND-PER-DIEM) gated on B2-S1. Carried from 2026-05-30. | Phase M load after B2-S1 decision. |
| B1-S3 | Rule #12 hard fail | 0 lifecycle states across 6 masters (210, 211, 212, 213, 214, 215). Carried from 2026-05-30. Gated on B1-S1 because state rows carry `domain_module_id`. | Author 6 state machines after B1-S1. |
| B1-S4 | Rule #17 hard fail | Skill 57 `expense-system` has `domain_module_id IS NULL`. Carried from 2026-05-30. Gated on B1-S1 module split. | Rebind / split skill after B1-S1. |
| B1-S5 | B4 pattern flags | All 6 masters carry blanket false flags; 8 specific flag flips proposed (see B2-S4 per-flag confirmation). Gated on B2-S4. | PATCH 6 `data_objects` rows after per-flag user confirmation. |
| B1-A4 | A4 / Rule #20 hard fail (new this audit) | `domains.catalog_tagline` and `domains.catalog_description` are both empty strings on the EXPENSE domain row (id 67). Rule #20 requires both populated in buyer voice; backfill allowed with surface-for-user review BEFORE write. Module-grain M8 is gated on B1-S1. | Draft both fields in buyer voice, surface to user for approval, then PATCH. |
| B1-H1 | H1 / APQC tagging | 10 of 17 cross-domain handoffs remain untagged (129, 171, 551, 552, 555, 599, 165, 559, 600, 1157). 4 prior `discovery_*` rows are REPLACE / CONFIRM candidates (38, 101, 139, 468). Action items: 7 net-new `agent_curated` proposals plus 4 REPLACE candidates. All proposals carry `record_status='new'` per Rule #1. | Load `handoff_processes` rows with available PCF IDs, defer remaining lookups to fix time. |

#### Bucket 1 count summary (this audit)

| Finding type | Count |
|---|---|
| MISSING (entity gap, in-scope) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M1, Rule #12, Rule #17, B4, A4) | 5 (S1, S3, S4, S5, A4) |
| BOUNDARY (NULL FK split by asymmetry) | 0 in-scope (S6/S9 blocked on S1; S7/S8 report-only) |
| APQC TAGGING | 1 (H1, 7 net-new plus 4 REPLACE) |
| MODULARIZATION ISSUES | 0 (B2-S1) |

### Bucket 2, Surface-for-user (judgment calls)

All 6 prior Bucket 2 items carry forward unchanged (B2-S1 module split, B2-S2 cards ownership, B2-S3 travel ownership, B2-S4 per-flag pattern flips, B2-S5 expense_policies vs spend_policies overlap, B2-S6 reimbursement disbursement path). One new item:

| ID | Question | Why agent cannot answer | Options |
|---|---|---|---|
| B2-EM | `domains.business_logic` on the EXPENSE row (id 67) contains an em-dash, which the project rule "No em-dashes" forbids in any artifact, catalog data included. The string is non-`notes` and pre-existed this audit, so a unilateral rewrite is out of scope; surface to user for the approved replacement. | Rewriting prose is editorial. Rule #15 covers `notes` columns only, but the project-wide em-dash rule applies catalog-wide. The agent will not unilaterally rewrite a non-empty `business_logic` value. | (a) Replace em-dash with a comma. (b) Split sentence (replace with period). (c) Rewrite (user supplies wording). (d) Defer. |

### Bucket 3, Phase 0 pending (speculative)

All 17 prior Bucket 3 items carry forward unchanged (10 MISSING entity candidates: `receipts`, `mileage_logs`, `per_diem_rates`, `cash_advances`, `expense_categories`, `traveler_profiles`, `policy_violations`, `delegate_authorizations`, `vat_tax_records`, `audit_trail_records`; 2 MODULARIZATION candidates: TRAVEL-AND-PER-DIEM to TRAVEL-MGMT, CORP-CARD-RECON to CORP-CARD-PROGRAM; 5 regulation candidates: IRS Publication 463, HMRC P11D, FCPA, GDPR, PCI-DSS). Candidate-domain queue entries TRAVEL-MGMT, CORP-CARD-PROGRAM, RECEIPT-CAPTURE-OCR continue at prior mention counts.

### Cross-bucket dependencies

- B1-S3, B1-S4, B1-S5 remain gated on B1-S1.
- B1-S1 itself remains gated on B2-S1.
- B2-S2 and B2-S3 have Bucket 3 dependencies on TRAVEL-MGMT and CORP-CARD-PROGRAM candidate-domain triage.
- B1-A4 (catalog UX) is independent of M1; draft, surface, write loop is the fix path.
- B1-H1 (APQC) is independent of all module-level fixes.
- B2-EM (em-dash in `business_logic`) is independent of all other items.

### Decisions

_(empty until reviewed; per-bucket decisions captured as the user makes them.)_

### Fixes applied (this audit)

None this audit. The 2026-05-31 continuation already applied B1-S2 (9 PATCH operations on trigger_events.event_category); that change is verified live and dropped from the open inventory. The 3 net-new `agent_curated` `handoff_processes` rows (130, 553, 554) entered the catalog between 2026-05-30 and this audit run; they remain `record_status='new'` and count toward H1 progress but not toward the quality headline (0 approved).

### JWT errors

None.

## 2026-06-02 — Audit (modularization)

### Summary

Phase-M modularization pass (scope: `domain_modules` + capability links + entity assignment only). EXPENSE went from 0 `domain_modules` (M1 hard fail carried since 2026-05-30) to 3 `module_kind='full'` modules, resolving M1. The split adopts the 2026-05-30 / 2026-05-31 audit recommendation (option (a) under B2-S1): EXPENSE-CAPTURE-AND-REPORTING, EXPENSE-CORP-CARD-RECON, EXPENSE-TRAVEL-AND-PER-DIEM. This shape cleanly survives the queued CORP-CARD-PROGRAM and TRAVEL-MGMT candidate-domain promotions (B2-S2 / B2-S3) because the card and travel masters are already isolated into their own modules.

All 6 capabilities were placed on a realizing module (M4 pass). All 9 linked data_objects were assigned to their owning module, preserving the existing `role` + `necessity` from `domain_data_objects`. Every master lands in exactly one module (M7 single-master pass). No module is empty (each realizes >=1 capability and holds >=1 data_object).

This pass did NOT create data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships. Module codes carry the `EXPENSE-` prefix and `module_kind='full'`. `record_status` omitted on every insert (R1; all rows landed `new`). `notes` left empty on every DMC / DMDO row (R15). Module `catalog_tagline` / `catalog_description` intentionally left empty (M8 / A4 backfill gap, recorded below). No vendor/product names in module names or descriptions (R18).

### Module split

| Module (code, id) | Capabilities realized | Data objects (role / necessity) |
|---|---|---|
| EXPENSE-CAPTURE-AND-REPORTING (191) | EXPENSE-CAPTURE (72), EXPENSE-POLICY (73), REIMBURSEMENT (76), TIME-TRACKING (30, shared) | expense_reports (210, master/required), expense_lines (211, master/required), expense_policies (214, master/required), org_units (34, embedded_master/required), saas_subscriptions (62, consumer/required), supplier_invoices (75, consumer/required) |
| EXPENSE-CORP-CARD-RECON (192) | CORP-CARD (74) | corporate_cards (212, master/required), card_transactions (213, master/required) |
| EXPENSE-TRAVEL-AND-PER-DIEM (193) | TRAVEL-BOOK (75) | travel_bookings (215, master/required) |

Placement rationale: the policy-enforcement capability (73) co-locates with capture-and-reporting because `expense_policies` is applied at `expense_line` entry; a dedicated EXPENSE-POLICY-AND-AUDIT module (the option (c) 4-module shape) was not adopted because there is no policy-only master to anchor it today (the `policy_violations`, `vat_tax_records`, `audit_trail_records` candidates remain Bucket 3). The shared TIME-TRACKING capability (30) is realized through time-card collection feeding expense entry, so it sits on capture-and-reporting. The two `consumer` data_objects (saas_subscriptions for the SMP shadow-IT signal, supplier_invoices for the AP-AUTO reimbursement path) sit on capture-and-reporting where expense_reports / expense_lines live.

### Master -> module mapping

- expense_reports (210) -> 191 (master)
- expense_lines (211) -> 191 (master)
- expense_policies (214) -> 191 (master)
- corporate_cards (212) -> 192 (master)
- card_transactions (213) -> 192 (master)
- travel_bookings (215) -> 193 (master)

Each master is mastered in exactly one module (M7 satisfied).

### Counts created

| Table | Rows inserted |
|---|---|
| domain_modules | 3 |
| domain_module_capabilities | 6 |
| domain_module_data_objects | 9 |

### Deferred gaps (out of scope for this pass)

- **Phase-S system skill per module (Rule #17 -> F2/F3).** Skill 57 `expense-system` still has `domain_module_id IS NULL` (orphan). With 3 modules now live, Rule #17 requires one `system` skill per `domain_modules` row, so the single orphan skill must be split into 3 module-bound system skills (191 / 192 / 193) with its 7 `skill_tools` redistributed: query tools for 210/211/214 -> 191, query tools for 212/213 -> 192, query tool for 215 -> 193, `send_email` channel primitive on all. Recorded as B1A-S4 (now agent-actionable, no longer blocked). Note: skill 57's `description` also still contains an em-dash, a separate editorial item tracked under B2-EM.
- **Module-grain catalog UX copy (M8 / A4 -> Rule #20).** All 3 new modules have empty `catalog_tagline` / `catalog_description`. Buyer-voice copy backfill (with surface-for-user approval) is now possible since the modules exist. Recorded as B1A-M8. The domain-row A4 backfill (B1A-A4) remains open and independent.
- **6 master state machines (Rule #12 / B12).** Still 0 `data_object_lifecycle_states` rows across 210, 211, 212, 213, 214, 215. Now unblocked because the modules exist to carry `domain_module_id` on each state row. Carried as B1B-S3, re-pointed at the new module ids.
- **EXPENSE-side B10b NULL FK backfills.** Outbound `source_domain_module_id` (11 rows) and inbound `target_domain_module_id` (6 rows) can now be populated against modules 191 / 192 / 193. Carried as B1B-S6 / B1B-S9 (re-pointed).
- **Pattern flag flips (B4) and APQC tagging (H1).** Unchanged and independent of this pass; carried forward.

### Fixes applied (this audit)

- Created 3 `domain_modules` (191, 192, 193), 6 `domain_module_capabilities`, 9 `domain_module_data_objects`. Loader: [.tmp_deploy/modularize_expense_2026-06-02.ts](../../.tmp_deploy/modularize_expense_2026-06-02.ts) (idempotent; safe to re-run).

### JWT errors

None.

## 2026-06-06 - b1a execution

Executed the 3 agent-solvable pending actions (`b1a`) against the live `domain_map` module. Loader: [.tmp_deploy/fix_expense_b1a_2026_06_06.ts](../../.tmp_deploy/fix_expense_b1a_2026_06_06.ts) (idempotent; empty-guarded on every catalog UX field; dedups skill / skill_tools by natural key). `record_status` omitted on every insert (R1, all landed `new`). No `notes` writes (R15). No em-dashes; American English.

### B1A-S4 - DONE (split orphan system skill 57 into 3 module-bound system skills + redistribute 7 skill_tools)

- **`skills` PATCH (1 row):** skill 57 `expense-system` rebound from `domain_module_id=NULL` to `domain_module_id=191`, and its `description` rewritten to drop the forbidden em-dash and become module-scoped.
  - PRIOR: `domain_module_id=null`; `description="System skill for Expense Management — runtime workflows over the domain's master data, derived from masters + cross-domain handoffs."` (contained an em-dash; this also clears the B2-EM em-dash item on the skill-description side).
  - NEW: `domain_module_id=191`; `description="System skill for the Expense Capture and Reporting module. Runs agent workflows over expense reports, expense lines, and expense policies: querying report and line state, checking lines against active policy, and notifying submitters and approvers as reports move through the approval lifecycle."`
- **`skills` INSERT (2 rows):** id 312 `expense_corp_card_recon_agent` (`domain_module_id=192`), id 313 `expense_travel_and_per_diem_agent` (`domain_module_id=193`). Both `skill_type='system'`, `domain_id=67`, `record_status='new'`.
- **`skill_tools` DELETE (3 rows):** removed the corp-card + travel tool links that moved off skill 57 (now module 191). PRIOR rows (skill 57): id 530 (tool 458 `query_travel_bookings`), id 531 (tool 459 `query_corporate_cards`), id 532 (tool 460 `query_card_transactions`). Snapshot of skill 57's full prior link set before delete: tool ids 26, 456, 457, 458, 459, 460, 37 (rows 527-533).
- **`skill_tools` INSERT (5 rows):** redistributed by master ownership, reusing existing catalog-wide `tools` rows (no new `tools` created):
  - 192 (skill 312): tool 459 `query_corporate_cards` (do 212), tool 460 `query_card_transactions` (do 213), tool 37 `send_email` (channel primitive).
  - 193 (skill 313): tool 458 `query_travel_bookings` (do 215), tool 37 `send_email`.
- **Final distribution (verified):** skill 57/191 -> query_expense_reports, query_expense_lines, query_expense_policies, send_email (4); skill 312/192 -> query_corporate_cards, query_card_transactions, send_email (3); skill 313/193 -> query_travel_bookings, send_email (2). F2 (one system skill per module), F3 (>=1 skill_tools each), F4 (operation_kind <-> data_object_id pairing) all satisfied.

### B1A-M8 - DONE (module catalog UX backfill, buyer voice)

`domain_modules` PATCH (3 rows): wrote `catalog_tagline` + `catalog_description` into the empty fields on 191, 192, 193 per revised Rule #20 (write straight into empty fields; review signal carried by `record_status='new'`; not pre-surfaced to chat, not parked in history). Empty-guard confirmed all 6 fields empty pre-write. Buyer voice (workflow + value); no vendor/product names; no em-dashes.

### B1A-A4 - DONE (domain catalog UX backfill, buyer voice)

`domains` PATCH (1 row): wrote `catalog_tagline` + `catalog_description` into the empty fields on domain 67 (EXPENSE) per revised Rule #20. Empty-guard confirmed both fields empty pre-write.

### Counts written

| Table | Operation | Rows |
|---|---|---|
| skills | PATCH | 1 (id 57) |
| skills | INSERT | 2 (id 312, 313) |
| skill_tools | DELETE | 3 (id 530, 531, 532) |
| skill_tools | INSERT | 5 |
| domain_modules | PATCH | 3 (id 191, 192, 193; catalog UX) |
| domains | PATCH | 1 (id 67; catalog UX) |

### Skipped / not executed

- None of the `b1a` items were skipped; all 3 fully resolved.
- `b1b` (B1B-S3 lifecycle states, B1B-S6 handoff module FKs, B1B-H1 APQC tagging, B1B-S5 pattern flags) and all `b2` / `b3` items left untouched per scope. B1B-S3 / B1B-S6 list a `prerequisite_entity` / `depends_on` ref to B1A-S4 (now satisfied: each module has a system skill), but they are `b1b` tier, not `b1a`, so out of scope for this pass. B1B-H1 and B1B-S5 carry `user_decision` `blocked_by` refs (B2-EM / B2-S4) and remain blocked.
- B2-EM: the skill-description half of the em-dash item is now resolved (skill 57 description rewritten as part of B1A-S4). The `domains.business_logic` em-dash on row 67 remains a `b2` `user_decision` item and was NOT touched (non-empty descriptive prose, overwrite is user-approval-only).

### JWT errors

None.
