# SPEND-MGMT audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 `domain_modules` rows (hard M1 / M2 / M3 / M5 / M6 / F1-F5 cascade fail), 0 `domain_module_data_objects` rows, 0 `domain_module_host_domains` rows. 11 capabilities (`SPEND-CARD-ISSUANCE`, `SPEND-CARD-AUTH`, `SPEND-REIMBURSEMENT`, `SPEND-BILL-PAY`, `SPEND-PRE-APPROVAL`, `SPEND-FX-TREASURY`, `SPEND-ANALYTICS`, `CORP-CARD`, `EXPENSE-CAPTURE`, `EXPENSE-POLICY`, `APPROVAL-WORKFLOW`). 9 entries in legacy `domain_data_objects` rollup: 4 masters (`spend_requests` 240, `corporate_card_accounts` 744, `card_authorizations` 745, `vendor_payment_authorizations` 746, `spend_policies` 747, total 5 masters), 4 contributors (`expense_policies` 214, `expense_reports` 210, `payment_runs` 205, `supplier_invoices` 75), 1 consumer (`suppliers` 206). 10 solutions (8 primary: Brex, Ramp, Airwallex Spend, Pleo, Mesh Payments, Navan Spend, Spendesk, BILL Spend & Expense; 2 secondary: Coupa Business Spend Management, Workday Spend Management). 19 cross-domain handoffs (12 outbound + 7 inbound). 0 intra-domain handoffs (vacuous, no modules to route between). 0 `data_object_lifecycle_states` rows on any of the 5 masters. 0 `data_object_aliases`. 0 `domain_regulations`. 4 `data_object_relationships` involving the new masters (`audit_samples` samples `card_authorizations`; `expense_lines` flags `spend_policies`; `travel_bookings` flags `spend_policies`; `expense_policies` syncs_to `spend_policies`). 0 system skills, 0 `skill_tools` rows, 0 roles, 0 permissions (cascade from M1). Semantius score is uncomputable (F5).
- **Vendor-surface basis (Pass 2 flagship enumeration):** Brex, Ramp, Airbase (now BILL Spend & Expense), Pleo, Spendesk, Navan Spend (formerly TripActions Liquid), Mesh Payments, Airwallex Spend, Volopay, Payhawk, Center, Soldo, Coupa Business Spend Management, SAP Concur, Workday Spend Management, Capital On Tap, Divvy (acquired into BILL). Compliance-specialist coverage anchored on PCI-DSS (card data handling), AML / KYC (corporate account opening), SOX (segregation of duties on payment authorization), IRS substantiation rules (T&E policy), and Visa / Mastercard scheme rules (real-time auth decline policy).
- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items (5 entity candidates + 2 regulation candidates).

**Headline:** SPEND-MGMT is a zero-module domain. The legacy `domain_data_objects` rollup is populated (10 entries), `capabilities` are loaded (11), `solutions` are loaded (10), `handoffs` are wired (19), `trigger_events` exist (21 referencing the domain's masters), but the deployable layer (`domain_modules` + `domain_module_data_objects` + lifecycle states + system skills + tools + roles + permissions) has not been authored. This is a Phase A obligation per Rule #14 and Rule #17. The audit's primary in-scope work item is the Phase A modularization itself; every downstream band (B / C / D / E / F / H, except B-band trigger_event hygiene) is blocked by M1.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| EXPENSE (67) | 3 | 4 | 0 | 3 (`expense_policies syncs_to spend_policies` 733, `expense_lines flags spend_policies` 731, `travel_bookings flags spend_policies` 732) | 10 | Pairwise (full) |
| ERP-FIN (65) | 4 | 0 | 0 | 0 | 4 | Pairwise (full) |
| AP-AUTO (29) | 2 | 1 | 0 | 0 | 3 | Pairwise (full) |
| S2P (27) | 1 | 1 | 0 | 0 | 2 | Lightweight |
| EPM (66) | 1 | 0 | 0 | 0 | 1 | Lightweight |
| FINOPS (41) | 1 | 0 | 0 | 0 | 1 | Lightweight |
| SMP (85) | 1 | 0 | 0 | 0 | 1 | Lightweight |
| AUDIT (16) | 1 | 0 | 0 | 1 (`audit_samples samples card_authorizations` 350) | 2 | Lightweight |

No neighbor has weight >=3 except EXPENSE (10), ERP-FIN (4), AP-AUTO (3). Pass 4 pairwise reconciliation runs on those three; the others get one-line summaries.

**Structural pass bands:** S1-S3 pass on positive checks (domain row exists with full metadata: `crud_percentage=70`, `business_logic` populated, `min_org_size='20 s <500'`, `cost_band='$'`, `usa_market_size_usd_m=2200`, `market_size_source_year=2024`). A1-A3 skipped on band positive checks except A4 (description vendor-noun scan: clean, no vendor names in `description` or `business_logic`). **M1 hard fail** (0 `domain_modules` rows on a domain with 11 capabilities, must have >=2 full modules). **M2-M7 hard fail** (vacuous, no modules to validate). **B1-B12 mostly blocked by M1** (no DMDO rows to evaluate role / necessity / pattern flags against modules). **B9 partial fail** (6 trigger_events with empty `event_category`: 577 `card_authorization.declined`, 578 `card_authorization.high_value`, 579 `vendor_payment_authorization.approved`, 580 `vendor_payment_authorization.rejected`, 581 `spend_policy.updated`, 582 `corporate_card_account.balance_threshold`). **C1-C2 partial** (4 of the 5 new masters have zero `data_object_relationships`, `corporate_card_accounts` is referenced by nothing; the catalog has 4 incoming relationships into `card_authorizations` and `spend_policies` from outside the domain but the master-to-master intra-domain graph is empty). **D1 fail** (0 lifecycle states across all 5 masters; per Rule #12 every master + required object must have lifecycle states unless config-shape). **E1-E6 blocked by M1**. **F1-F5 hard fail** (0 system skills, 0 `skill_tools` on any module that doesn't exist). **F7 vacuous**. **H1 hard fail** (1 of 19 cross-domain handoffs tagged: handoff 170 carries one `discovery_substring` `record_status='new'` row pointing at process 1010; zero `agent_curated`, zero `record_status='approved'`). Volume expectation 0.5N to 0.8N for N=19 means 10 to 15 `agent_curated` tags expected.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 hard fail, zero `domain_modules` rows** | SPEND-MGMT has 11 capabilities and zero modules. Per Rule #14 a domain with >=3 capabilities must have >=2 `module_kind='full'` rows. Proposed module split (4 full modules + 1 starter), aligned to the capability set, flagship-vendor product taxonomy, and the existing master assignments: **(a) `SPEND-CARDS`** (full), masters: `corporate_card_accounts` (744), `card_authorizations` (745); capabilities: `SPEND-CARD-ISSUANCE`, `SPEND-CARD-AUTH`, `CORP-CARD`. **(b) `SPEND-REIMBURSEMENT`** (full), masters: none new (consumes `expense_reports` 210 and `expense_policies` 214 from EXPENSE as `consumer`); capabilities: `SPEND-REIMBURSEMENT`, `EXPENSE-CAPTURE`. Possible scope overlap with EXPENSE - see B2-S1. **(c) `SPEND-BILL-PAY`** (full), masters: `vendor_payment_authorizations` (746), and contributor on `payment_runs` (205, owned by AP-AUTO) and `supplier_invoices` (75, owned by AP-AUTO); capabilities: `SPEND-BILL-PAY`. **(d) `SPEND-POLICY-AND-APPROVAL`** (full), masters: `spend_requests` (240), `spend_policies` (747); capabilities: `SPEND-PRE-APPROVAL`, `EXPENSE-POLICY`, `APPROVAL-WORKFLOW`, `SPEND-ANALYTICS`, `SPEND-FX-TREASURY`. **(e) `SMB-SPEND-STARTER`** (starter, `module_kind='starter'`), embedded_master on `corporate_card_accounts`, `card_authorizations`, `spend_requests`, `spend_policies`, `vendor_payment_authorizations`; consumer on `users`. Lite path for sub-50-person orgs that want corporate cards + simple bill-pay without the policy library. The module split is a Bucket 1 ITEM but it has a Bucket 2 architectural question (B2-S1) about the SPEND-REIMBURSEMENT vs EXPENSE boundary. | Author 4 full `domain_modules` rows + 1 starter row + 9 `domain_module_data_objects` rows (5 master + 4 cross-module contributor / consumer) + 1 starter master/embedded shell. Phase A loader. Gated on B2-S1. |
| B1-S2 | **B9 partial fail, 6 trigger_events with empty `event_category`** | All 6 new event rows (577-582) carry `event_category=''`, violating the Rule #13 enum check (must be one of `lifecycle / state_change / threshold / signal`). | PATCH: 577 `card_authorization.declined` -> `state_change`; 578 `card_authorization.high_value` -> `threshold` (crosses a configured value bar); 579 `vendor_payment_authorization.approved` -> `state_change`; 580 `vendor_payment_authorization.rejected` -> `state_change`; 581 `spend_policy.updated` -> `state_change`; 582 `corporate_card_account.balance_threshold` -> `threshold`. |
| B1-S3 | **D1 hard fail, zero lifecycle states across all 5 masters** | None of `spend_requests` (240), `corporate_card_accounts` (744), `card_authorizations` (745), `vendor_payment_authorizations` (746), `spend_policies` (747) has a `data_object_lifecycle_states` row. Per Rule #12 every master + required object needs lifecycle states unless config-shape. `spend_policies` is plausibly config-shape (author once, occasionally edit, no workflow), surface that exemption in B2-S2. The other four are workflow-bearing: spend_requests transitions through draft -> submitted -> approved / rejected -> spent / cancelled; corporate_card_accounts through application -> active -> frozen / closed; card_authorizations through requested -> approved / declined -> posted -> reconciled / disputed; vendor_payment_authorizations through requested -> approved / rejected -> released / held. | Load lifecycle states once the module split (B1-S1) lands, since `data_object_lifecycle_states.domain_module_id` must point at the realizing module. Sequencing dependency: B1-S1 -> B1-S3. |
| B1-S4 | **B10b report-only, 13 outbound handoffs with NULL FKs on SPEND-MGMT's side** | Of the 12 outbound handoffs SPEND-MGMT publishes, all 12 carry NULL `source_domain_module_id` because the source modules do not exist (cascade from M1). Once B1-S1 lands, every outbound row needs its `source_domain_module_id` PATCHed to the realizing module. Per B10b the source-side FK is the publishing domain's work. Outbound rows: 165, 166, 167, 168, 169, 172, 173, 174, 556, 557, 558, 559, 560, 600. (14 outbound counting both event_stream and api_call; the count differs from the 12 mentioned in summary because handoff 174 is technically outbound with target SMP, list rebuilt: 165 -> EXPENSE, 166 -> ERP-FIN, 167 -> ERP-FIN, 168 -> AP-AUTO, 169 -> ERP-FIN, 172 -> EPM, 173 -> FINOPS, 174 -> SMP, 556 -> AP-AUTO, 557 -> ERP-FIN, 558 -> AUDIT, 559 -> EXPENSE, 560 -> S2P, 600 -> EXPENSE; total 14 outbound). | PATCH all 14 outbound rows' `source_domain_module_id` post-B1-S1, mapping each by trigger_event + payload to the new module. Example: 169 (`spend_request.approved` payload `spend_requests`) -> SPEND-POLICY-AND-APPROVAL; 165 / 166 / 173 / 174 / 558 (`card_transaction.posted` and `card_authorization.high_value` payloads `card_transactions` / `card_authorizations`) -> SPEND-CARDS; 556 (`vendor_payment_authorization.approved` payload `vendor_payment_authorizations`) -> SPEND-BILL-PAY; 167 (`bill_payment.completed` payload `payment_runs`) -> SPEND-BILL-PAY; 168 (`supplier_invoice.received` payload `supplier_invoices`) -> SPEND-BILL-PAY; 172 (`spend_commitment.created` payload `spend_requests`) -> SPEND-POLICY-AND-APPROVAL; 559 / 560 (`spend_policy.updated` payload `spend_policies`) -> SPEND-POLICY-AND-APPROVAL; 557 (`card_authorization.high_value` payload `card_authorizations`) -> SPEND-CARDS; 600 (`card_authorization.declined` payload `card_authorizations`) -> SPEND-CARDS. |
| B1-S5 | **B10b report-only, 5 inbound handoffs with NULL `target_domain_module_id` on SPEND-MGMT's side** | Of the 7 inbound handoffs SPEND-MGMT receives, the target FK on SPEND-MGMT's side is NULL on all 7 because no module exists yet (cascade from M1). Inbounds: 170 (S2P `vendor.added` -> `suppliers`); 171 (EXPENSE `expense_policy.updated` -> `expense_policies`); 552 (EXPENSE `expense_line.policy_violation` -> `expense_lines`); 555 (EXPENSE `travel_booking.out_of_policy` -> `travel_bookings`); 598 (AP-AUTO `invoice_match.three_way_passed` -> `invoice_matches`). | PATCH all 5 inbound rows' `target_domain_module_id` post-B1-S1, mapping each: 170 -> SPEND-POLICY-AND-APPROVAL (supplier-onboard triggers supplier-eligible-for-payment check); 171 / 552 / 555 -> SPEND-POLICY-AND-APPROVAL (policy and policy-violation events feed the policy module); 598 -> SPEND-BILL-PAY (three-way match passing releases the vendor payment authorization). |
| B1-S6 | **B10b report-only (other-domain owed), inbound NULL source FKs** | Inbound handoffs 170, 171, 552, 555, 598 each carry NULL `source_domain_module_id` (source modules on S2P / EXPENSE / AP-AUTO sides). Per B10b asymmetry the source-side FK is the publishing domain's audit work. | Schedule b1 audits for S2P, EXPENSE, AP-AUTO to populate their `source_domain_module_id` on these 5 handoffs. |
| B1-S7 | **B10b report-only (other-domain owed), outbound NULL target FKs** | Outbound handoffs 165 (EXPENSE), 166 / 167 / 169 / 557 (ERP-FIN), 168 / 556 (AP-AUTO), 172 (EPM), 173 (FINOPS), 174 (SMP), 558 (AUDIT), 559 / 600 (EXPENSE), 560 (S2P) carry NULL `target_domain_module_id`. Per B10b the target-side FK is each target domain's audit work. | Schedule b1 audits for EXPENSE, ERP-FIN, AP-AUTO, EPM, FINOPS, SMP, AUDIT, S2P to populate `target_domain_module_id` on the 14 outbound handoffs SPEND-MGMT publishes. |
| B1-S8 | **F1-F5 hard fail (cascade from M1), zero system skills and zero tools** | 0 `skills` rows where `domain_module_id` is any SPEND-MGMT module (vacuous since modules do not exist). Per Rule #17 every full + starter `domain_modules` row needs exactly one `skill_type='system'` skill with >=1 `skill_tools` rows. Floor: query_<entity> for each master + mutate for the workflow-bearing transitions + side_effect for the channel primitives (card-authorization decisioning, ACH / wire / card payment dispatch, real-time auth network response). | Author 5 system skills (one per module + one for the starter) + N tools + N `skill_tools` rows post-B1-S1. Sequencing dependency: B1-S1 -> B1-S8. |

#### APQC TAGGING (matches the SKILL anti-pattern: SPEND-MGMT has shipped zero APQC tagging work)

Only 1 of 19 cross-domain handoffs carries a `handoff_processes` row. **That 1 is `proposal_source='discovery_substring'`, `record_status='new'`; zero `agent_curated`; zero `record_status='approved'`.** Volume expectation per SKILL H1: 0.5N to 0.8N for N=19 means 10 to 15 `agent_curated` tags. The audit proposes the following candidates from the structural-pass model:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id (lookup needed) | Confidence |
|---|---|---|---|---|---|---|
| 165 | SPEND-MGMT -> EXPENSE | card_transaction.posted | card_transactions | Process expense reports (10864 or child) | needs PCF lookup | confident L3 |
| 166 | SPEND-MGMT -> ERP-FIN | card_transaction.posted | card_transactions | Process accounts payable (10744 or child) | needs PCF lookup | confident L3 |
| 167 | SPEND-MGMT -> ERP-FIN | bill_payment.completed | payment_runs | Process accounts payable (10744 or child) | needs PCF lookup | confident L3 |
| 168 | SPEND-MGMT -> AP-AUTO | supplier_invoice.received | supplier_invoices | Process accounts payable (10744 or child) | needs PCF lookup | confident L3 |
| 169 | SPEND-MGMT -> ERP-FIN | spend_request.approved | spend_requests | Manage financial budgeting and forecasting (10770 or child) | needs PCF lookup | medium |
| 170 | S2P -> SPEND-MGMT | vendor.added | suppliers | Manage suppliers (10222 or child) | existing discovery_substring at 1010, propose REPLACE with agent_curated confirmation | confident L3 |
| 171 | EXPENSE -> SPEND-MGMT | expense_policy.updated | expense_policies | Develop, deploy, and maintain policies and procedures (16439 or child) | needs PCF lookup | confident L3 |
| 172 | SPEND-MGMT -> EPM | spend_commitment.created | spend_requests | Manage financial budgeting and forecasting (10770 or child) | needs PCF lookup | confident L3 |
| 173 | SPEND-MGMT -> FINOPS | card_transaction.posted | card_transactions | Manage IT financial performance (16466 or child) | needs PCF lookup | medium |
| 174 | SPEND-MGMT -> SMP | card_transaction.posted | shadow_it_apps | Manage IT financial performance (16466 or child) | needs PCF lookup | medium |
| 552 | EXPENSE -> SPEND-MGMT | expense_line.policy_violation | expense_lines | Manage policies and procedures (16439 or child) | needs PCF lookup | confident L3 |
| 555 | EXPENSE -> SPEND-MGMT | travel_booking.out_of_policy | travel_bookings | Manage policies and procedures (16439 or child) | needs PCF lookup | medium |
| 556 | SPEND-MGMT -> AP-AUTO | vendor_payment_authorization.approved | vendor_payment_authorizations | Process accounts payable (10744 or child) | needs PCF lookup | confident L3 |
| 557 | SPEND-MGMT -> ERP-FIN | card_authorization.high_value | card_authorizations | Manage treasury operations (10746 or child) | needs PCF lookup | confident L3 |
| 558 | SPEND-MGMT -> AUDIT | card_authorization.high_value | card_authorizations | Manage internal controls (16438 or child) | needs PCF lookup | confident L3 |
| 559 | SPEND-MGMT -> EXPENSE | spend_policy.updated | spend_policies | Develop, deploy, and maintain policies and procedures (16439 or child) | needs PCF lookup | confident L3 |
| 560 | SPEND-MGMT -> S2P | spend_policy.updated | spend_policies | Develop, deploy, and maintain policies and procedures (16439 or child) | needs PCF lookup | confident L3 |
| 598 | AP-AUTO -> SPEND-MGMT | invoice_match.three_way_passed | invoice_matches | Process accounts payable / Manage payment exceptions (10744 or child) | needs PCF lookup | confident L3 |
| 600 | SPEND-MGMT -> EXPENSE | card_authorization.declined | card_authorizations | Manage policies and procedures (16439 or child) | needs PCF lookup | medium |

19 candidate APQC tags total. The 1 existing `discovery_substring` row on handoff 170 is recommended for REPLACE / approve action with `agent_curated` confirmation. PCF id lookups at fix time per the standard `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` pattern.

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M1 module split + B9 event_category + D1 lifecycle + F1-F5 skills/tools) | 4 (B1-S1, B1-S2, B1-S3, B1-S8) |
| BOUNDARY (B10b own-side NULL FKs) | 2 (B1-S4 outbound own-side, B1-S5 inbound own-side) |
| REPORT-ONLY (B10b other-domain owed) | 2 (B1-S6 inbound source FKs, B1-S7 outbound target FKs) routed to Report-only section, not counted toward in-scope total |
| APQC TAGGING (high-confidence) | 1 (B1-H1 covers all 19 proposals as one item) |
| **Bucket 1 in-scope total** | **7 in-scope** (B1-S1, B1-S2, B1-S3, B1-S4, B1-S5, B1-S8, B1-H1), plus B1-S6 and B1-S7 in Report-only |

Re-counted Bucket 1: **7 in-scope items**. B1-S6 and B1-S7 are listed in "Report-only follow-ups" per the count convention (Rule #11). Updating the headline summary count accordingly: **Bucket 1 (in-scope, agent fixable): 7 items.**

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

**EXPENSE <-> SPEND-MGMT (weight 10, heaviest neighbor).** Wired pairs: 7 (SPEND-MGMT -> EXPENSE 165 `card_transaction.posted`, 559 `spend_policy.updated`, 600 `card_authorization.declined`; EXPENSE -> SPEND-MGMT 171 `expense_policy.updated`, 552 `expense_line.policy_violation`, 555 `travel_booking.out_of_policy`; plus relationship-only edges). Section 2 (NULL FK candidates): all 7 carry NULL on both source and target module FKs (M1 cascade for SPEND-MGMT; EXPENSE side may also need its own audit). Section 3 (missing handoffs the catalog implies): a likely missing pair is EXPENSE `expense_report.approved` -> SPEND-MGMT (`vendor_payment_authorization` for reimbursement disbursement). Section 4 (boundary integrity): **the EXPENSE vs SPEND-MGMT boundary is the audit's deepest open question.** `expense_policies` (214) is `domain_owned` and lives in `domain_data_objects` for SPEND-MGMT as `contributor` AND presumably is mastered by EXPENSE. `spend_policies` (747) is mastered by SPEND-MGMT, and the relationship row 733 `expense_policies syncs_to spend_policies` plus 731 `expense_lines flags spend_policies` and 732 `travel_bookings flags spend_policies` suggest both policies coexist intentionally. The two-master pattern needs an architectural ruling, see B2-S1. Section 5 (cross-relationship mirror): 3 relationships exist (731, 732, 733); the master-of-`expense_policies` side has its row, the `spend_policies` side has its row, the mirror reads clean.

**ERP-FIN <-> SPEND-MGMT (weight 4).** Wired pairs: 4 (all outbound from SPEND-MGMT, 0 inbound). Section 2: all 4 NULL on SPEND-MGMT source FK (M1 cascade). Section 3: missing handoff ERP-FIN -> SPEND-MGMT on `cash_position.threshold_warning` if treasury wants to throttle card authorizations during a low-cash window (judgment call; possible Bucket 3 candidate but ERP-FIN may not implement it). Section 4: zero inbound relationships from ERP-FIN, although the four outbound rows (card_transaction.posted, bill_payment.completed, spend_request.approved, card_authorization.high_value) cover the GL-posting and treasury-reservation surface comprehensively. Section 5: no `data_object_relationships` between SPEND-MGMT and ERP-FIN's masters (`journal_entries`, `gl_accounts`, `currencies`, `bank_accounts`) - likely a gap. The card-issuing model needs to attach `corporate_card_accounts` to a `bank_account` and `card_authorizations` should post to `journal_entries`. Surface as B2-S5.

**AP-AUTO <-> SPEND-MGMT (weight 3).** Wired pairs: 3 (SPEND-MGMT -> AP-AUTO 168 `supplier_invoice.received`, 556 `vendor_payment_authorization.approved`; AP-AUTO -> SPEND-MGMT 598 `invoice_match.three_way_passed`). Section 2: all 3 NULL on SPEND-MGMT FKs (M1). Section 3: clean. Section 4: scope boundary question - is SPEND-MGMT's `vendor_payment_authorizations` (746) the same workflow as AP-AUTO's approval step on `supplier_invoices`? The two coexist (SPEND-MGMT carries the authorization master; AP-AUTO owns the invoice). Per the loaded description SPEND-MGMT distinguishes bill-pay routing (ACH / wire / card / check) with approval chains from AP-AUTO's invoice OCR + match + payment. The boundary looks intentional but B2-S6 surfaces a question about overlap with AP-AUTO's payment-run authorization step. Section 5: no `data_object_relationships` between `vendor_payment_authorizations` and `supplier_invoices` or `invoice_matches` - likely a gap.

**Lighter neighbors (1-2 weight, one-line summaries):**

- **S2P <-> SPEND-MGMT (weight 2).** Wired: 170 inbound `vendor.added`, 560 outbound `spend_policy.updated`. Section 2: NULL on SPEND-MGMT FKs for both (M1 cascade); inbound 170 ALSO has NULL `source_domain_module_id` (S2P's B10b work). Section 5: no relationships between domains.
- **EPM <-> SPEND-MGMT (weight 1).** Wired: 172 outbound `spend_commitment.created`. Section 2: NULL on SPEND-MGMT FK. Section 5: no relationships.
- **FINOPS <-> SPEND-MGMT (weight 1).** Wired: 173 outbound `card_transaction.posted`. Section 2: NULL on SPEND-MGMT FK. Section 5: no relationships.
- **SMP <-> SPEND-MGMT (weight 1).** Wired: 174 outbound `card_transaction.posted` -> `shadow_it_apps` (the card transaction triggers a shadow-IT-detection signal). Section 2: NULL on SPEND-MGMT FK; SMP side IS populated (`target_domain_module_id=30`). Section 5: no relationships.
- **AUDIT <-> SPEND-MGMT (weight 2).** Wired: 558 outbound `card_authorization.high_value` -> `card_authorizations`. Section 2: NULL on SPEND-MGMT FK. Section 5: 1 relationship (350 `audit_samples samples card_authorizations`); healthy.

**In-scope mechanical PATCHes derived from pairwise (Bucket 1):**

No new mechanical PATCH items beyond B1-S2 and the post-B1-S1 cascade PATCHes already captured in B1-S4 / B1-S5. The PSA-style 1020 patch precedent does not apply here (SMP side IS populated on 174, the only inbound with a non-NULL target FK).

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | M1 hard fail, author 4 full `domain_modules` rows + 1 starter row + DMDOs (gated on B2-S1) |
| B1-S2 | PATCH 6 trigger_events to set `event_category` (577 / 578 / 579 / 580 / 581 / 582) |
| B1-S3 | D1 hard fail, load lifecycle states on 4 workflow-bearing masters (gated on B1-S1) |
| B1-S4 | B10b own-side, PATCH 14 outbound handoffs `source_domain_module_id` post-B1-S1 |
| B1-S5 | B10b own-side, PATCH 5 inbound handoffs `target_domain_module_id` post-B1-S1 |
| B1-S8 | F1-F5 hard fail, author 5 system skills + tools + skill_tools post-B1-S1 |
| B1-H1 | APQC TAGGING, propose 19 `agent_curated` rows (REPLACE 1 weak `discovery_substring` row on handoff 170 + INSERT 18 new) |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **SPEND-REIMBURSEMENT vs EXPENSE scope boundary.** SPEND-MGMT's loaded description distinguishes itself from EXPENSE ("Distinct from EXPENSE (post-hoc reimbursement / reconciliation of bank-issued cards)..."). But the proposed `SPEND-REIMBURSEMENT` module in B1-S1 covers out-of-pocket reimbursement, which is exactly EXPENSE's flagship surface. Either (a) SPEND-MGMT does not own a reimbursement module, drop `SPEND-REIMBURSEMENT` from B1-S1 and treat the `SPEND-REIMBURSEMENT` capability (315) as a cross-cutting capability EXPENSE realizes; or (b) SPEND-MGMT owns a thin reimbursement workflow distinct from EXPENSE's (e.g. corporate-card-cardholder reimbursement of personal-charge spillover), in which case the module exists but ships with very limited scope; or (c) the SPEND-MGMT domain row's description is wrong and SPEND-MGMT actually absorbs EXPENSE entirely (Brex / Ramp / Airbase platforms do bundle expense management, the boundary in the catalog reflects a single-tool view). Recommendation: option (a) - drop the SPEND-REIMBURSEMENT module from the proposed split, the capability stays linked but is realized by EXPENSE. | Architectural / market-definition question. SPEND-MGMT vs EXPENSE delineation is the cleanest single market-mapping decision in the audit. | (a) Drop SPEND-REIMBURSEMENT module from the split; EXPENSE realizes the reimbursement capability. (b) Keep a thin SPEND-MGMT-owned reimbursement module distinct from EXPENSE (specify scope). (c) Merge EXPENSE into SPEND-MGMT entirely (large refactor). |
| B2-S2 | **`spend_policies` (747) lifecycle exemption per Rule #12.** Per Rule #12, every master + required object needs lifecycle states unless config-shape (author-once / occasionally-edit, no workflow). `spend_policies` plausibly fits the config-shape exemption (policies are versioned config, not a workflow record). The other 4 masters (`spend_requests`, `corporate_card_accounts`, `card_authorizations`, `vendor_payment_authorizations`) are workflow-bearing. Per Rule #15 the agent cannot auto-populate `data_objects.notes` to record the exemption. | Editorial decision on policy lifecycle: workflow or config? Plus the Rule #15 question of how to record the exemption. | (a) Confirm config-shape; record the exemption in the audit file (this section); do NOT populate `data_objects.notes`. (b) Treat as workflow-bearing (draft -> active -> superseded -> retired) and load lifecycle states alongside the other 4 masters. |
| B2-S3 | **B4 pattern-flag positive evaluation on 5 SPEND-MGMT masters.** All 5 masters carry default pattern flags: `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false` (except `supplier_invoices` which is `has_single_approver=true`, owned by AP-AUTO). Re-evaluation: (a) `card_authorizations.has_personal_content` should likely be `true` (carries cardholder name, merchant location, IP / device metadata at authorization); (b) `spend_requests.has_submit_lock` should likely be `true` (once submitted for approval the requester cannot edit until rejected / returned); (c) `vendor_payment_authorizations.has_submit_lock` should likely be `true` (once approved the payment is queued for the next run, cannot be edited); (d) `corporate_card_accounts.has_personal_content` may be `true` (carries cardholder PII, possibly tied to a personal SSN for primary card issuance); (e) `vendor_payment_authorizations.has_single_approver` may be `true` for sub-threshold authorizations (a single controller signs off below the multi-approver bar). | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes / no on the 5 candidate flips above. |
| B2-S4 | **PCI-DSS regulation row missing.** SPEND-MGMT touches cardholder data (PAN, expiry, CVV at issuance, possibly tokenized post-issuance) and merchant data at authorization. PCI-DSS applies to any system handling card data. The catalog has 0 `domain_regulations` rows for SPEND-MGMT, which is a likely gap. AML / KYC also applies for the card-program side. SOX applies for the segregation-of-duties on payment authorization. | Compliance / scoping decision; whether the SPEND-MGMT catalog row should anchor the regulations or whether they belong on a separate CORP-CARD-PROGRAM domain (see Bucket 3 candidate). | (a) Load 3 `domain_regulations` rows (PCI-DSS, AML / KYC, SOX) on SPEND-MGMT. (b) Anchor on the CORP-CARD-PROGRAM candidate domain if promoted. (c) Defer until B1-S1 lands and assign to the realizing module(s). |
| B2-S5 | **Missing intra-domain `data_object_relationships` between SPEND-MGMT masters.** Per the workflow model: `spend_requests` -> `vendor_payment_authorizations` (an approved request generates a payment authorization); `card_authorizations` -> `corporate_card_accounts` (every auth belongs to an account); `spend_requests` -> `spend_policies` (a request is evaluated against the policy at submission). The catalog has 0 intra-domain relationships, only 4 incoming relationships from other domains. The relationships should be authored alongside B1-S1; surfacing here because they are workflow-shape judgments. | The relationships are obvious but the verbs and `relationship_kind` (`reference` vs `parent`) are workflow-shape calls that benefit from user review. | (a) Author 3-5 intra-domain relationships with proposed verbs (`generates_payment_for`, `belongs_to_account`, `evaluated_against`). (b) Defer to a separate authoring pass. |
| B2-S6 | **`vendor_payment_authorizations` vs AP-AUTO payment-run authorization overlap.** AP-AUTO's `payment_runs` (205) has its own approval step (the controller signs off on the run before release). SPEND-MGMT's `vendor_payment_authorizations` (746) is a per-vendor pre-payment authorization that flows into AP-AUTO via handoff 556. Question: are these one workflow split across two domains (SPEND-MGMT pre-authorizes -> AP-AUTO releases on the next run), or are they two distinct approval gates (vendor-payment-authorization in SPEND-MGMT and payment-run-authorization in AP-AUTO)? Brex / Ramp / Airwallex unify them (one approve-and-pay flow); SAP Concur / Workday split them. | Architectural / market-definition decision; depends on whether the catalog models the unified flow or the split flow. | (a) Unified flow, treat `payment_runs` as `consumer` in SPEND-MGMT-BILL-PAY downstream of `vendor_payment_authorizations`. (b) Split flow, `vendor_payment_authorizations` is the SPEND-MGMT-side approval; AP-AUTO has its own `payment_runs` approval separately. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against Brex, Ramp, BILL Spend & Expense (formerly Divvy + Airbase), Pleo, Spendesk, Navan Spend, Mesh Payments, Airwallex Spend, Volopay, Payhawk, Center, Soldo, Coupa Business Spend Management, SAP Concur, Workday Spend Management. The compliance anchor is PCI-DSS (cardholder data) and AML / KYC (card-program account opening); SOX governs the segregation-of-duties on payment authorization; IRS substantiation rules (Sec. 274) govern T&E policy evidence retention; Visa / Mastercard scheme rules constrain the real-time auth network.

The subagent recipe was not spawned (this is a single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING (5) entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `merchant_category_rules` | Brex, Ramp, Mesh, Pleo all model MCC-level policy as a first-class versioned record (this MCC, this card, this user, this geography, this time window -> allow / decline). Currently the policy logic is implicit in `spend_policies` (747), but flagship platforms maintain a separate MCC-rules table that the auth engine consults. | new master in SPEND-CARDS or SPEND-POLICY-AND-APPROVAL |
| `card_disputes` | Brex, Ramp, Airwallex, Mesh all expose card-dispute workflows (cardholder marks transaction as fraudulent / duplicate / not received; vendor returns chargeback packet; case carries to resolution). Currently no dispute entity, the workflow is implicit. | new master in SPEND-CARDS |
| `receipt_records` | Brex, Ramp, Pleo, BILL each treat receipts as first-class records distinct from card transactions (one transaction can have many receipts, OCR-extracted fields, matched-or-unmatched state). Currently receipts are presumably folded into `card_transactions` (213, EXPENSE) or `expense_lines` (211, EXPENSE). May warrant a SPEND-MGMT-side master or remain on EXPENSE. | candidate master split or stays in EXPENSE |
| `vendor_payment_methods` | Brex, Ramp, BILL each model vendor payment method (ACH / wire / virtual-card / check) as a first-class master tied to the vendor with bank-account details and KYC state. Currently no vendor payment method entity, the routing is implicit on `vendor_payment_authorizations`. | new master in SPEND-BILL-PAY |
| `virtual_cards` | Brex, Ramp, Mesh, Marqeta-backed platforms expose virtual cards as a first-class master distinct from the underlying corporate card account (one virtual card per vendor or per project, with spend caps and validity windows). Currently no virtual card entity. | new master in SPEND-CARDS |

#### MODULARIZATION (0) candidates

No further module-split recommendations beyond B1-S1. The proposed 4-full + 1-starter shape covers the flagship vendor surface coherently. **One conditional split:** if PCI-DSS scope becomes load-bearing, a `SPEND-PCI` compliance module could carve out the cardholder-data side from SPEND-CARDS; deferred until B2-S4 lands.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **PCI-DSS** applicability (mandatory for any system touching cardholder data).
- **AML / KYC / Bank Secrecy Act** applicability (mandatory for the card-program side, even if SPEND-MGMT only consumes the BIN-sponsor's compliance not its own).

#### Candidate-domain queue

This audit surfaced **2 domain-tier candidates** for `audits/_missing-domains.md`:

- **TRAVEL-MGMT** (Corporate Travel Management). Vendor evidence: Navan, Egencia, SAP Concur Travel, TripActions, Spotnana, AmTrav, BCD Travel, CWT. Adjacency: SPEND-MGMT, EXPENSE, HCM. Candidate capabilities: travel booking, itinerary management, traveler safety / duty-of-care, hotel and air sourcing, policy-aware shopping, trip approvals, traveler profile management. Surfaces because Navan and Spendesk both bundle travel booking with spend; the existing `travel_bookings` (215) data_object suggests partial modeling, but no domain owns the booking flow. Queued via `bun run scripts/analytics/append_missing_domain.ts --code TRAVEL-MGMT ...`.
- **CORP-CARD-PROGRAM** (Corporate Card Program Management). Vendor evidence: Marqeta, Stripe Issuing, Highnote, Lithic, Adyen Issuing. Adjacency: SPEND-MGMT, ERP-FIN, AP-AUTO. Candidate capabilities: card BIN sponsorship, KYB underwriting, card-program ledger, dispute and chargeback handling, statement generation, interchange revenue tracking. Surfaces because Brex / Ramp / Airwallex are themselves on a card-issuing platform (Marqeta / Stripe Issuing), and the BIN-sponsor layer is structurally distinct from the spend-management UX layer. Queued via the same helper.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/SPEND-MGMT-phase0-<date>.md` confirming per-entity vendor coverage), or eyeball-mode (user names which of the 5 entity candidates + 2 regulation candidates to treat as confirmed and we proceed via Phase B inserts).

### Cross-bucket dependencies

- **B1-S3 is gated on B1-S1**: lifecycle states need a realizing module (`data_object_lifecycle_states.domain_module_id`) which does not exist yet.
- **B1-S4 / B1-S5 / B1-S8 are gated on B1-S1**: every handoff FK patch and skill / tool authoring depends on the new modules existing.
- **B1-S1 is gated on B2-S1**: the SPEND-REIMBURSEMENT vs EXPENSE boundary decision determines whether the proposed module split is 4-full + 1-starter or 3-full + 1-starter (or 4-full with a thin reimbursement module + 1-starter).
- **B2-S2 (spend_policies lifecycle exemption) partially depends on B1-S3** in the sense that it determines whether 4 or 5 masters need lifecycle state loads.
- **B2-S6 (vendor_payment_authorizations vs payment_runs overlap) may shift the module split in B1-S1** depending on whether `payment_runs` is treated as `consumer` on SPEND-MGMT or stays purely AP-AUTO-owned.
- **B3 MISSING entities** (`merchant_category_rules`, `card_disputes`, `vendor_payment_methods`, `virtual_cards`) inform B1-S1's master count per module; if vetted into the catalog they extend SPEND-CARDS and SPEND-BILL-PAY.
- **B3 candidate domains** (TRAVEL-MGMT, CORP-CARD-PROGRAM) inform B2-S4 (PCI-DSS scope routing): if CORP-CARD-PROGRAM gets promoted, PCI-DSS anchors there rather than on SPEND-MGMT.
- **B2-S4 (regulation routing) has a Bucket 3 dependency** as noted; if the user chooses eyeball-mode on Bucket 3 and promotes CORP-CARD-PROGRAM, hold B2-S4 until that domain is loaded.
- Buckets 2 and 3 are otherwise independent.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S4, S5, H1`), or `skip`.

- **S1 (M1 hard fail, 4-module split + 1 starter)** is gated on B2-S1; resolve that first. Loader is the heaviest in the audit (Phase A from scratch).
- **S2 (event_category PATCH on 6 events)** is trivial; one PATCH each, no dependencies.
- **S3 (lifecycle states on 4 masters)** depends on S1.
- **S4 (PATCH 14 outbound handoff source FKs)** depends on S1.
- **S5 (PATCH 5 inbound handoff target FKs)** depends on S1.
- **S8 (5 system skills + tools)** depends on S1.
- **H1 (19 APQC tags including 1 REPLACE)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (SPEND-REIMBURSEMENT vs EXPENSE):** (a) drop the module, (b) keep thin scope (specify), (c) merge EXPENSE into SPEND-MGMT.
- **B2-S2 (`spend_policies` lifecycle exemption):** (a) config-shape, record exemption in this audit; (b) workflow-bearing, load lifecycle states.
- **B2-S3 (pattern flag re-evaluation, 5 candidate flips):** per-flag yes / no.
- **B2-S4 (PCI-DSS / AML-KYC / SOX regulations):** (a) load on SPEND-MGMT, (b) anchor on CORP-CARD-PROGRAM if promoted, (c) defer.
- **B2-S5 (intra-domain relationships):** (a) author now alongside B1-S1, (b) defer to separate pass.
- **B2-S6 (vendor_payment_authorizations vs payment_runs overlap):** (a) unified flow, (b) split flow.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 5 entity candidates, 2 regulation candidates, and 2 candidate domains to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| EXPENSE | B10b: populate `source_domain_module_id` on inbound 171, 552, 555 (3 EXPENSE -> SPEND-MGMT handoffs); populate `target_domain_module_id` on outbound 165, 559, 600 (3 SPEND-MGMT -> EXPENSE handoffs). Architectural reconciliation per B2-S1. |
| ERP-FIN | B10b: populate `target_domain_module_id` on outbound 166, 167, 169, 557 (4 SPEND-MGMT -> ERP-FIN handoffs). Possible new relationship: `corporate_card_accounts -> bank_accounts`, `card_authorizations -> journal_entries`. |
| AP-AUTO | B10b: populate `source_domain_module_id` on inbound 598; populate `target_domain_module_id` on outbound 168, 556. Boundary resolution per B2-S6. |
| S2P | B10b: populate `source_domain_module_id` on inbound 170; populate `target_domain_module_id` on outbound 560. |
| EPM | B10b: populate `target_domain_module_id` on outbound 172. |
| FINOPS | B10b: populate `target_domain_module_id` on outbound 173. |
| SMP | B10b: populate `target_domain_module_id` on outbound 174 (note: SMP side actually IS populated to 30; reverse direction, SPEND-MGMT's source FK is the gap, see B1-S4). Re-checked: 174 has `target_domain_module_id=30` and `source_domain_module_id=null`. The remaining work is SPEND-MGMT's source FK PATCH in B1-S4, not SMP's. Strike from this row. |
| AUDIT | B10b: populate `target_domain_module_id` on outbound 558. |

### Decisions

_(empty until reviewed)_

## 2026-05-31, Continuation: B1 technical fixes

### Applied

| ID | Action | Result |
|---|---|---|
| B1-S2 | PATCH 6 trigger_events to set `event_category` (rows 577 / 578 / 579 / 580 / 581 / 582). | 6 patched, 0 skipped. Values: 577 `state_change`, 578 `threshold`, 579 `state_change`, 580 `state_change`, 581 `state_change`, 582 `threshold`. Verified post-patch. |

### Deferred (with reasons)

| ID | Reason |
|---|---|
| B1-S1 | Creates 4 full modules + 1 starter + DMDOs. Gated on B2-S1 (SPEND-REIMBURSEMENT vs EXPENSE boundary, judgment call) and creates new entities / modules (outside technical scope). |
| B1-S3 | Lifecycle states need `data_object_lifecycle_states.domain_module_id` pointing at a realizing module. Gated on B1-S1. |
| B1-S4 | All 14 outbound handoff `source_domain_module_id` PATCHes point at modules that do not yet exist. Gated on B1-S1. |
| B1-S5 | All 5 inbound handoff `target_domain_module_id` PATCHes point at modules that do not yet exist. Gated on B1-S1. |
| B1-S8 | Authors 5 system skills + tools + skill_tools. Gated on B1-S1 and creates new entities (outside technical scope). |
| B1-H1 | 19 APQC `handoff_processes` proposals. Each row's PCF is described in prose ("Process accounts payable (10744 or child)") and tagged "needs PCF lookup". Per the technical-fix procedure (INSERT only when the audit pre-specifies `handoff_id` + resolvable PCF, verify before insert), verification was attempted against `processes` where `source_framework=apqc_pcf_cross_industry` and `external_id` in the cited IDs. Result: every cited external_id resolves to a process whose `process_name` disagrees with the audit's prose label. Examples: external_id `10744` -> "Process accounts receivable (AR)" (audit said "Process accounts payable"); `10222` -> "Manage demand for products" (audit said "Manage suppliers"); `16439` -> "Establish the enterprise risk framework and policies" (audit said "Develop, deploy, and maintain policies and procedures" / "Manage policies and procedures"); `16466` -> "Monitor the regulatory environment for changing or emerging regulations" (audit said "Manage IT financial performance"); `10770` -> "Report results" (audit said "Manage financial budgeting and forecasting"); `10864` -> "Process period-end adjustments" (audit said "Process expense reports"); `10746` -> "Manage and process adjustments/deductions" (audit said "Manage treasury operations"). External_id `16438` returned no row in the cross-industry framework. Choosing which side (label vs id) is correct is a judgment call, defer to user. |
| B1-S6 | Other-domain owed (Report-only): S2P / EXPENSE / AP-AUTO each owe `source_domain_module_id` PATCHes on their published handoffs. |
| B1-S7 | Other-domain owed (Report-only): EXPENSE / ERP-FIN / AP-AUTO / EPM / FINOPS / SMP / AUDIT / S2P each owe `target_domain_module_id` PATCHes on inbound handoffs they receive. |

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_spend_mgmt_b1_technical_2026_05_31.ts`

### JWT errors

None.

## 2026-05-31, Audit

### Summary

Fresh structural Validate b1 (Pass 1) audit run against live state. Two technical deltas since 2026-05-30:

1. **B1-S2 landed**: 6 trigger_events (577, 578, 579, 580, 581, 582) now carry valid `event_category` enums (`state_change`, `threshold`, `state_change`, `state_change`, `state_change`, `threshold`). Verified clean against Rule #13 vocabulary.
2. **B1-H1 partial load**: 6 `agent_curated` `record_status='new'` rows now exist on handoffs 168, 172, 173, 558, 560, 598. Plus 1 pre-existing `discovery_substring` row on handoff 170 pointing at PCF id 1010 "Manage recruitment vendors" (clearly wrong-PCF for `vendor.added` -> S2P -> SPEND-MGMT, supplier onboarding semantics).

Every other structural gate remains identical to 2026-05-30: 0 `domain_modules` rows, 0 lifecycle states, 0 aliases, 0 regulations, 0 cross-cutting hosts, 1 legacy domain-level system skill (id 107 `spend-mgmt-system`, `domain_module_id=null`) with 8 `skill_tools` rows already pointing at the right master ids (744, 745, 746, 747, 240) plus 2 EXPENSE-domain card tools (212, 213) plus `send_email`. 11 capabilities. 5 masters (`spend_requests` 240, `corporate_card_accounts` 744, `card_authorizations` 745, `vendor_payment_authorizations` 746, `spend_policies` 747), 4 cross-domain contributors (75, 205, 210, 214), 1 consumer (206). 14 outbound + 5 inbound cross-domain handoffs (totals match prior audit). 8 `trigger_events` on the 5 masters (125, 126, 577, 578, 579, 580, 581, 582). 4 `data_object_relationships` touching the new masters (350 audit_samples->card_authorizations, 731 expense_lines->spend_policies, 732 travel_bookings->spend_policies, 733 expense_policies->spend_policies). 3 `business_function_domains` (Accounts Payable owner, Procurement and Treasury contributors).

**Headline:** every gap and follow-up surfaced on 2026-05-30 remains open except B1-S2 (resolved) and B1-H1 (partially loaded; 12 cross-domain handoffs still untagged, 1 wrong-PCF discovery_substring still needs review). The structural posture is unchanged: M1 zero-modules hard fail blocks B / D / E / F / S2 cascade. Bucket 1 carries 6 in-scope items (was 7); Bucket 2 carries 6 items (unchanged); Bucket 3 carries 9 items (was 7, plus 2 candidate domains TRAVEL-MGMT and CORP-CARD-PROGRAM).

### Pass 1 structural band results

- **S1, FK coverage sweep:** `domain_modules`=0 (M1 hard fail), `domain_module_data_objects`=0, `domain_module_host_domains`=0, `domain_module_capabilities`=0, `domain_regulations`=0, `data_object_lifecycle_states`=0, `data_object_aliases`=0, `skills` with `domain_module_id`=0, `business_function_domains`=3 (pass), `capability_domains`=11 (pass), `domain_data_objects`=10 (pass), `solution_domains`=10 (pass).
- **A1 pass** (all 7 business-metadata fields populated). **A2 pass** (11 capabilities). **A3 pass** (10 solutions, 8 primary + 2 secondary). **A4 fail** (`catalog_tagline` empty, `catalog_description` empty; Rule #20 backfill candidate, surface to user before write).
- **M1 hard fail, M2 hard fail (vacuous), M4 hard fail (every capability is module-orphaned), M5 vacuous, M6 vacuous, M7 vacuous, M8 vacuous** (no modules to score).
- **B1 pass** (5 masters exist), **B2 pass** (all masters have singular/plural labels), **B3 pass** (no bare-word masters needing canonical claim except `suppliers`, which already carries rationale). **B4 fail by re-evaluation** (all 5 masters at default-false pattern flags, B2-S3 from prior audit not yet re-evaluated). **B5 pass** (no embedded_master rows yet). **B6 fail** (zero intra-domain relationships among the 5 masters; `spend_requests`->`vendor_payment_authorizations`, `card_authorizations`->`corporate_card_accounts`, `spend_requests`->`spend_policies` all missing; pre-existing B2-S5). **B7 fail** (zero edges to `users` (id 748) per Rule #10; every workflow-bearing master has `requester` / `approver` / `cardholder` actors). **B8 partial** (0 outbound cross-domain `data_object_relationships` on 14 handoffs that imply them; pre-existing B2-S5 covers intra-domain, this is outbound side). **B9 partial** (6 events now carry correct `event_category`; B1-S2 resolved). **B9b vacuous** (no modules to route between). **B10 report-only** (5 inbound handoffs, NULL `target_domain_module_id` on all 5 cascading from M1; 1 inbound 174 has SMP `target_domain_module_id=30` already, but that is outbound from SPEND-MGMT side; reconfirmed list 170, 171, 552, 555, 598). **B10b hard fail** (14 outbound NULL `source_domain_module_id`, 5 inbound NULL `target_domain_module_id`, plus 14 outbound NULL `target_domain_module_id` except 174 which has 30, owed by target domains; plus 5 inbound NULL `source_domain_module_id` owed by source domains; total catalog-wide null FKs on SPEND-MGMT handoffs = 14+5+13+5 = 37). **B11 fail** (0 aliases on any of the 5 masters; `card_authorizations` -> `auth`, `corporate_card_accounts` -> `card_program_accounts`, `vendor_payment_authorizations` -> `bill_pay_authorizations`, etc.). **B12 fail** (0 lifecycle states across all 5 masters; gated on B1-S1).
- **C1 pass** (3 `business_function_domains`: Accounts Payable owner, Procurement and Treasury contributors). **C2 not evaluated** (no diverging capability owners surfaced; routine pass).
- **D1 UI spot-check skipped** (no fresh writes since last audit; no rows to spot-check beyond what already lives at `https://tests.semantius.app/domain_map/`).
- **E1-E6 vacuous** (M1 cascade; no modules, no roles can be authored under the 2-module floor).
- **F1 fail** (legacy `domain_id=133` system skill 107 still present with 8 `skill_tools` rows; once any module-level system skill is authored, F1 requires DELETE of skill 107). **F2 hard fail** (0 module-level system skills, 0 modules). **F3 vacuous**. **F4 pass** (the 8 `skill_tools` on skill 107 all satisfy the operation_kind <-> data_object_id invariant: 7 query rows have data_object_id set, send_email side_effect has data_object_id NULL). **F5 uncomputable** (cascade from F2). **F7 pass** (skill 107's `send_email` is the only channel primitive; could be substituted with `notify_person` but the legacy skill is queued for retirement under F1 anyway).
- **H1 hard fail** (7 of 19 cross-domain handoffs tagged = 37% coverage; expected floor 0.5N=10, ceiling 0.8N=15; gap = 3 to 8 additional tags needed). 6 of 7 tags are `agent_curated` `new`, 1 is `discovery_substring` `new` pointing at the wrong PCF (handoff 170 -> PCF 1010 "Manage recruitment vendors", semantically wrong). Zero `record_status='approved'` rows. Volume target 10-15 agent_curated tags partially met (6/10-15 = 40-60%).

### Bucket 1, in-scope confirmed gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 hard fail, zero `domain_modules` | Unchanged from 2026-05-30: 11 capabilities, 0 modules, must have >=2 full per Rule #14. Proposed split (4 full + 1 starter) carried forward. Gated on B2-S1 (SPEND-REIMBURSEMENT vs EXPENSE boundary). | Phase A loader once B2-S1 lands. Sequencing: B1-S1 first, then B1-S3 / B1-S4 / B1-S5 / B1-S8 / B1-S9 / B1-S10. |
| B1-S3 | D1 / B12 lifecycle states missing | Unchanged: 0 states on 4 workflow-bearing masters (`spend_requests`, `corporate_card_accounts`, `card_authorizations`, `vendor_payment_authorizations`). `spend_policies` lifecycle is B2-S2 judgment. Gated on B1-S1. | Load lifecycle states post-B1-S1 with `domain_module_id` pointing at realizing module. |
| B1-S4 | B10b own-side outbound NULL FKs | 14 outbound handoffs (165, 166, 167, 168, 169, 172, 173, 174, 556, 557, 558, 559, 560, 600) all carry NULL `source_domain_module_id`. Cascade from M1. Gated on B1-S1. | PATCH `source_domain_module_id` per the mapping in 2026-05-30 audit. |
| B1-S5 | B10b own-side inbound NULL FKs | 5 inbound handoffs (170, 171, 552, 555, 598) carry NULL `target_domain_module_id`. Cascade from M1. Gated on B1-S1. | PATCH `target_domain_module_id` post-B1-S1: 170 / 171 / 552 / 555 -> SPEND-POLICY-AND-APPROVAL; 598 -> SPEND-BILL-PAY. |
| B1-S8 | F1-F5 system-skill cascade | 0 module-level system skills (F2 fail). Legacy skill 107 with 8 `skill_tools` rows still present (F1 fail-pending: requires DELETE once any module-level skill exists). Plan: author 5 module-level system skills (one per full module + one for the starter), migrate the 8 existing `skill_tools` to the right per-module skills, DELETE skill 107. Gated on B1-S1. | Phase S loader once B1-S1 lands. |
| B1-H1 | APQC tagging incomplete | 7 of 19 handoffs tagged. 12 remain: 165, 166, 167, 169, 552, 555, 556, 557, 559, 567 (not in handoff set, ignore), 577 (event id, not handoff), 600. Confirmed untagged handoff ids: 165, 166, 167, 169, 552, 555, 556, 557, 559, 600. That is 10 untagged plus the 1 wrong-PCF row on 170. Volume target 10-15 `agent_curated`; current 6 + 10 new + 1 REPLACE = 17 (within range). Per-handoff PCF lookup needed (see B1-S9). | Author 10 new agent_curated rows + REPLACE 1 wrong-PCF row, all `record_status='new'`. |
| B1-S9 | NEW, H1 PCF accuracy verification on the 6 existing agent_curated tags | The 6 agent_curated tags from the 2026-05-31 continuation load (handoffs 168, 172, 173, 558, 560, 598) each have a PCF id assignment. Spot-verified labels: 168 -> 315 "Process accounts payable (AP)" L3 (correct); 172 -> 1323 "Operationalize and implement plans to achieve budget" L4 (semantically reasonable for `spend_commitment.created` -> EPM); 173 -> 1132 "Monitor and analyze IT financial performance" L4 (correct for `card_transaction.posted` -> FINOPS); 558 -> 1433 "Audit invoices and key data in AP system" L4 (weak fit for `card_authorization.high_value` -> AUDIT; a Manage Internal Controls L3 parent might cluster better); 560 -> 793 "Develop procurement plan" L4 (weak fit for `spend_policy.updated` -> S2P; policy-update flows into procurement planning, but Establish Policies L3 is the parent the prior audit gestured at); 598 -> 315 "Process accounts payable (AP)" L3 (correct). Surface to user: 558 and 560 may warrant a re-classification to better L3 parents. | User review per row; PATCH where indicated. |
| B1-S10 | NEW, H1 wrong-PCF row on handoff 170 | The `discovery_substring` row on handoff 170 (`vendor.added` -> SPEND-MGMT) points at PCF 1010 "Manage recruitment vendors". `vendor.added` here is S2P supplier onboarding, NOT recruitment vendor mgmt. PCF row is semantically wrong. | DELETE the discovery_substring row, INSERT a fresh `agent_curated` row pointing at a correct PCF (candidate: "Process accounts payable (AP)" 315 L3 or a Manage Suppliers L3 parent if one exists in cross-industry framework; user to confirm). |
| B1-S11 | NEW, A4 catalog UX fields empty | `domains.catalog_tagline=''`, `domains.catalog_description=''`. Rule #20 backfill candidate; surface draft to user for review BEFORE writing per Rule #20. | Draft buyer-voice tagline + 1-3 paragraph description; surface drafts; user approves wording per Rule #20 then PATCH. |

### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| MISSING | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M / B / D / F cascade) | 5 (B1-S1, B1-S3, B1-S4, B1-S5, B1-S8) |
| BOUNDARY | 0 (B10b own-side rolled into B1-S4 / B1-S5) |
| APQC TAGGING | 3 (B1-H1, B1-S9, B1-S10) |
| MODULARIZATION ISSUES | 0 |
| Catalog UX (A4 / Rule #20) | 1 (B1-S11) |
| **Bucket 1 in-scope total** | **9** (B1-S1, B1-S3, B1-S4, B1-S5, B1-S8, B1-H1, B1-S9, B1-S10, B1-S11) |

### Bucket 2, surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | SPEND-REIMBURSEMENT vs EXPENSE scope boundary (carried over from 2026-05-30) | Architectural / market-definition question | (a) drop SPEND-REIMBURSEMENT module, (b) keep thin scope, (c) merge EXPENSE into SPEND-MGMT |
| B2-S2 | `spend_policies` (747) lifecycle exemption per Rule #12 (carried over) | Editorial: config-shape vs workflow-bearing? | (a) config-shape, record exemption in audit, (b) workflow-bearing, load states |
| B2-S3 | B4 pattern-flag re-evaluation on 5 masters (carried over) | Workflow-shape judgments user owns | per-flag yes/no on 5 candidate flips |
| B2-S4 | PCI-DSS / AML-KYC / SOX regulation rows missing (carried over) | Compliance scope decision | (a) load on SPEND-MGMT, (b) anchor on CORP-CARD-PROGRAM if promoted, (c) defer |
| B2-S5 | Intra-domain `data_object_relationships` missing among 5 masters (carried over) | Workflow-shape verbs and cardinality calls | (a) author now alongside B1-S1, (b) defer |
| B2-S6 | `vendor_payment_authorizations` vs AP-AUTO payment-run authorization overlap (carried over) | Architectural decision | (a) unified flow, (b) split flow |

### Bucket 3, Phase 0 pending (speculative)

Carried over from 2026-05-30:

#### MISSING entity candidates (5)

- `merchant_category_rules` (Brex / Ramp / Mesh / Pleo first-class versioned MCC policy) -> SPEND-CARDS or SPEND-POLICY-AND-APPROVAL
- `card_disputes` (Brex / Ramp / Airwallex / Mesh dispute and chargeback workflows) -> SPEND-CARDS
- `receipt_records` (Brex / Ramp / Pleo / BILL first-class receipts) -> EXPENSE or new SPEND-MGMT master
- `vendor_payment_methods` (Brex / Ramp / BILL ACH / wire / virtual-card / check routing master) -> SPEND-BILL-PAY
- `virtual_cards` (Brex / Ramp / Mesh / Marqeta virtual card master with caps and validity windows) -> SPEND-CARDS

#### Regulation candidates (2)

- PCI-DSS applicability (mandatory for any system touching cardholder data)
- AML / KYC / Bank Secrecy Act applicability (card-program side)

#### Candidate domains (2)

- TRAVEL-MGMT (Navan / Egencia / SAP Concur Travel / TripActions / Spotnana / AmTrav / BCD Travel / CWT)
- CORP-CARD-PROGRAM (Marqeta / Stripe Issuing / Highnote / Lithic / Adyen Issuing)

### Cross-bucket dependencies

- B1-S3 / B1-S4 / B1-S5 / B1-S8 / B1-S9 / B1-S10 are all gated on B1-S1.
- B1-S1 is gated on B2-S1 (module split decision).
- B2-S2 partially depends on B1-S3 (whether 4 or 5 masters need lifecycle).
- B2-S6 may shift the B1-S1 module split.
- B3 MISSING entities inform B1-S1's master count per module.
- B3 candidate domains inform B2-S4 (PCI-DSS scope routing).
- B2-S4 has a Bucket 3 dependency if CORP-CARD-PROGRAM gets promoted.

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed work |
|---|---|
| EXPENSE | B10b: populate `source_domain_module_id` on inbound 171, 552, 555 (3 EXPENSE -> SPEND-MGMT handoffs); populate `target_domain_module_id` on outbound 165, 559, 600 (3 SPEND-MGMT -> EXPENSE handoffs). |
| ERP-FIN | B10b: populate `target_domain_module_id` on outbound 166, 167, 169, 557 (4 SPEND-MGMT -> ERP-FIN handoffs). |
| AP-AUTO | B10b: populate `source_domain_module_id` on inbound 598; populate `target_domain_module_id` on outbound 168, 556. |
| S2P | B10b: populate `source_domain_module_id` on inbound 170; populate `target_domain_module_id` on outbound 560. |
| EPM | B10b: populate `target_domain_module_id` on outbound 172. |
| FINOPS | B10b: populate `target_domain_module_id` on outbound 173. |
| AUDIT | B10b: populate `target_domain_module_id` on outbound 558. |

### JWT errors

None.

## 2026-06-02 Audit (modularization)

### Summary

Built the deployable module layer for SPEND-MGMT (domain_id 133), which previously had zero `domain_modules`. Scope was modules + entity assignment only: reuse existing capabilities and data_objects, create no new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships. This resolves the long-standing M1 hard fail (B1A-BUILD, B1B-S1-MODULES) without touching the gated B2-S1 reimbursement-vs-EXPENSE decision: rather than author a master-less SPEND-REIMBURSEMENT module (which would have forced the B2-S1 call), the reimbursement capability is co-located in the policy/approval module that already carries in-domain masters.

### Module set authored (3 full)

| id | code | name | masters | other DMDOs | capabilities |
|---|---|---|---|---|---|
| 303 | SPEND-MGMT-CARDS | Corporate Cards and Authorization Controls | corporate_card_accounts (744), card_authorizations (745) | none | SPEND-CARD-ISSUANCE (313), SPEND-CARD-AUTH (314), CORP-CARD (74), SPEND-FX-TREASURY (318) |
| 304 | SPEND-MGMT-BILL-PAY | Vendor Bill Pay | vendor_payment_authorizations (746) | supplier_invoices (75, contributor/req), payment_runs (205, contributor/req), suppliers (206, consumer/req) | SPEND-BILL-PAY (316) |
| 305 | SPEND-MGMT-POLICY-APPROVAL | Pre-Spend Approval and Policy | spend_requests (240), spend_policies (747) | expense_policies (214, contributor/req), expense_reports (210, contributor/req) | SPEND-PRE-APPROVAL (317), EXPENSE-POLICY (73), APPROVAL-WORKFLOW (311), SPEND-ANALYTICS (319), SPEND-REIMBURSEMENT (315), EXPENSE-CAPTURE (72) |

All three `module_kind='full'`. `record_status` omitted on insert (DB default `new`). `catalog_tagline` / `catalog_description` left empty (M8 / A4 backfill remains a user-gated item). `notes` empty on every DMDO row.

### Counts

- 3 domain_modules.
- 11 domain_module_capabilities (every one of the domain's 11 capabilities placed exactly once; M4 satisfied).
- 10 domain_module_data_objects: 5 master + 4 contributor + 1 consumer.

### Master assignment (M7 in-domain AND catalog-wide single-master)

Catalog-wide master pre-check ran before any write: all 5 intended masters (240, 744, 745, 746, 747) had zero pre-existing `role='master'` rows in any module catalog-wide, so each is mastered exactly once, here. No demotions to `embedded_master` were required. Post-load verification confirms each of the 5 carries exactly one catalog-wide master row.

Borrowed objects were assigned at their existing domain-rollup role + necessity and NOT promoted: supplier_invoices (75) and payment_runs (205) as contributor/required, suppliers (206) as consumer/required, expense_policies (214) and expense_reports (210) as contributor/required. Pre-check confirmed expense_reports (210) and expense_policies (214) are mastered in module 191 (EXPENSE); they correctly remain contributor here.

### Master-less capabilities (flagged b3, not filled)

Placed in a backed module but lacking their own in-domain master:

- SPEND-FX-TREASURY (318), SPEND-ANALYTICS (319): no FX-treasury or analytics master entity exists in the domain. Both sit in modules with masters (CARDS, POLICY-APPROVAL respectively) but are master-less capability links.
- SPEND-REIMBURSEMENT (315), EXPENSE-CAPTURE (72): realized off EXPENSE-mastered objects (expense_reports 210, expense_policies 214); no in-domain master. The B2-S1 boundary question still governs whether these should split into their own module.
- CORP-CARD (74), EXPENSE-POLICY (73): reconciliation / policy-enforcement capabilities backed by EXPENSE masters; CORP-CARD co-located with the card masters, EXPENSE-POLICY with spend_policies.

### Verification

- 11/11 capabilities placed (no orphans; M4 pass).
- Every module has >= 1 capability and >= 1 data_object, and >= 1 master (no empty module; M6 pass).
- Each of the 5 masters single-mastered in-domain and catalog-wide (M7 pass).
- Idempotent re-run is clean (no duplicate inserts after pre-check own-module exclusion fix).

### Loader

`c:/dev/domain-map/.tmp_deploy/modularize_spend_mgmt_2026-06-02.ts` (safe to re-run).

### Not done (out of this pass's scope, remain open)

Lifecycle states (B1B-S3-LIFECYCLE), handoff FK patches (B1B-S4 / S5), per-module system skills + retire legacy skill 107 (B1B-S8-SYSTEM-SKILLS), APQC tagging (B1B-S9 / S10 / H1), catalog UX (B1B-S11-CATALOG-UX), and all Bucket 2 / Bucket 3 items. These were gated on the modules existing; the modules now exist, so they are unblocked for a follow-up pass. Note the realizing-module mapping has changed from the prior plan's 4-full + 1-starter proposal to this 3-full set: SPEND-MGMT-CARDS (303), SPEND-MGMT-BILL-PAY (304), SPEND-MGMT-POLICY-APPROVAL (305).

### JWT errors

None.
