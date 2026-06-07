# SUB-MGMT audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 2 full modules (`SUB-MGMT-SUBSCRIPTIONS` id 167, `SUB-MGMT-BILLING` id 168) + 1 hosted starter (`HVAC-SVC-MGMT` id 171, primary host FSM, embeds `customer_invoices` here). 5 masters (`customer_subscriptions` 106, `customer_invoices` 107, `usage_records` 108, `revenue_recognition_records` 109, `dunning_events` 110). 8 capabilities (no cross-cutting capability bound). 10 solutions (all `primary`). 14 trigger_events on the 5 masters (7 carry empty `event_category`). 14 outbound + 15 inbound cross-domain handoffs (29 cross-domain total). **0 intra-domain handoffs** across a 2-module domain that clearly exchanges `customer_invoices.issued` and `customer_invoice.past_due` events between billing and subscriptions. 0 aliases. 20 lifecycle states across 4 of 5 masters (`usage_records` has zero, M-band caveat below). **0 permissions, 0 roles, 0 role_modules, 0 system skills on either SUB-MGMT full module** (Phase E + Phase F never ran on this domain). Only the hosted HVAC starter carries a system skill (236, on module 171) and only because the FSM domain authored it. Cross-domain DMDOs on SUB-MGMT masters: CRM-ACCT-MGT consumes `customer_subscriptions` + `customer_invoices`; CSM-CASE-MGMT (optional) and CSM-ENTITLEMENTS (required) consume `customer_subscriptions`; PSA-PROJECT-FINANCIALS contributes to `revenue_recognition_records`; HVAC starter embeds `customer_invoices`.
- **Vendor-surface basis (Pass 2 flagship enumeration):** Stripe Billing, Zuora Billing and Revenue, Chargebee, Recurly, Maxio (Chargify + SaaSOptics), Aria Systems, Salesforce Revenue Cloud Subscription Management, OneBill, Sage Intacct Subscription Billing, Younium, Solvimon, plus the usage-metering specialists Metronome, Orb, Lago, Amberflo, m3ter and the rev-rec specialist RightRev. Compliance anchored on ASC 606 / IFRS 15 (revenue recognition) and PCI-DSS (card data handling, indirect on the platform via the payment processor), with SOX considerations for public-company contract liability disclosures. Currently zero `domain_regulations` rows exist on SUB-MGMT, surfaced as a Bucket 2 gap.
- **Bucket 1 (in-scope, agent fixable):** 7 items (B1-S1 through B1-S6 structural + B1-H1 APQC tagging covering 29 cross-domain handoffs).
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 9 items (4 candidate domains already queued in `audits/_missing-domains.md` + 5 in-domain entity / modularization candidates).

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| CSM | 6 | 5 | 2 (CSM-CASE-MGMT optional consumer + CSM-ENTITLEMENTS required consumer on `customer_subscriptions`) | 2 (handoffs cover health_score.declined, customer.churn_confirmed, entitlement.depleted) | 13 | Pairwise (full) |
| CRM | 3 | 1 | 2 (CRM-ACCT-MGT consumer on `customer_subscriptions` + `customer_invoices`) | 1 (`customers subscribes_to customer_subscriptions` 431) | 6 | Pairwise (full) |
| ERP-FIN | 3 | 0 | 0 | 0 | 3 | Pairwise (full) |
| B2C-COMM | 1 | 2 | 0 | 1 (`commerce_orders` payload on inbound 331) | 3 | Pairwise (full) |
| CLM | 0 | 2 | 0 | 2 (`legal_contracts backs customer_subscriptions` 436, `legal_contracts renewed_into customer_subscriptions` 512) | 3 | Pairwise (full) |
| PSA | 0 | 0 | 1 (PSA-PROJECT-FINANCIALS contributor on `revenue_recognition_records`) | 1 (PSA flow into rev-rec) | 2 | Lightweight |
| CPQ | 0 | 1 | 0 | 0 | 1 | Lightweight |
| MDM | 0 | 1 | 0 | 0 | 1 | Lightweight |
| BI | 0 | 1 | 0 | 0 | 1 | Lightweight |
| APIM | 0 | 1 | 0 | 0 | 1 | Lightweight |

**Structural pass bands:** A (domain row metadata complete per Rule #8 with `crud_percentage=55`, `business_logic` populated, `min_org_size='20 s <500'`, `cost_band='$$$$'`, `usa_market_size_usd_m=2500`, `market_size_source_year=2025`, `certification_required=false`) passes. M1 passes (2 full modules, both with master DMDOs, satisfies Rule #14 with 8 capabilities). M2 passes (8 capabilities bound to 2 full modules across 8 `domain_module_capabilities` rows). M5 passes (capability-to-module split is coherent). **M3 partial-fail (usage_records has 0 lifecycle states)**, see B1-S3. **B9 partial-fail (7 of 14 trigger_events carry empty `event_category`)**, see B1-S2. **B9b hard-fail (0 intra-domain handoffs on a 2-module domain that demonstrably exchanges events)**, see B1-S4. **B10b.1 hard-fail on SUB-MGMT side (14 of 14 outbound handoffs have NULL `source_domain_module_id`)**, see B1-S1. Matches the catalog-wide b2 audit's count of 14 B10b.1 defects on SUB-MGMT exactly. **E2/E3 hard-fail (0 permissions, 0 roles, 0 role_modules on either full module)**, Phase E was never run on this domain, see B1-S5. **F2 hard-fail (0 `skill_type='system'` skills on modules 167 and 168)**, Phase F was never run, see B1-S6. F3/F4/F5 cannot evaluate without F2 satisfied. **H1 hard-fail (7 of 29 cross-domain handoffs tagged with `handoff_processes`; 2 `agent_curated`, 3 `discovery_substring`, 2 `discovery_override`; zero `record_status='approved'`)**.

SUB-MGMT Semantius score: **uncomputable** until Phase F lands. F2-F5 each block on the absent system skills on modules 167 and 168.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B10b.1 hard-fail, 14 outbound NULL source_domain_module_id** | All 14 outbound cross-domain handoffs (ids 64, 65, 72, 194, 195, 196, 197, 490, 491, 492, 493, 494, 495, 496) carry NULL `source_domain_module_id`. Per B10b SUB-MGMT owns its own `source_domain_module_id` regardless of who owns the target side. Routing per payload + trigger event: 64 (subscription.activated→customers), 65 (subscription.activated→customer_entitlements), 195 (subscription.renewal_required→customer_subscriptions), 196 (subscription.downgraded→customer_subscriptions), 490 (subscription.upgraded→customer_subscriptions), 494 (subscription.cancelled→customer_subscriptions), 197 (revenue.recognised→revenue_recognition_records), 495 (usage_record.overage_detected→usage_records ERP-FIN), 496 (usage_record.overage_detected→usage_records CSM) belong to SUB-MGMT-SUBSCRIPTIONS (167, masters: customer_subscriptions, usage_records, revenue_recognition_records). 72 (payment.failed→customer_cases), 194 (dunning.escalation→dunning_events), 491 (customer_invoice.issued→customer_invoices ERP-FIN), 492 (customer_invoice.issued→customer_invoices B2C-COMM), 493 (customer_invoice.past_due→customer_invoices CSM) belong to SUB-MGMT-BILLING (168, masters: customer_invoices, dunning_events). | PATCH 14 handoffs: set `source_domain_module_id=167` on (64, 65, 195, 196, 197, 490, 494, 495, 496); set `source_domain_module_id=168` on (72, 194, 491, 492, 493). |
| B1-S2 | **B9 partial-fail, missing event_category on 7 events** | 7 trigger_events carry empty `event_category` (Rule #13 enum allows `lifecycle / state_change / threshold / signal` only): 492 `customer_invoice.issued`, 493 `customer_invoice.paid`, 494 `customer_invoice.past_due`, 495 `usage_record.posted`, 496 `usage_record.overage_detected`, 541 `subscription.upgraded`, 542 `subscription.cancelled`. Existing rows in the same domain follow the pattern: `subscription.activated` is `lifecycle`, `subscription.renewal_required` is `threshold`, `subscription.downgraded` is `state_change`. | PATCH: 492 → `state_change`, 493 → `state_change`, 494 → `state_change`, 495 → `lifecycle` (a usage_record is born when posted, a creation lifecycle event), 496 → `threshold` (overage detected = a metered threshold crossed), 541 → `state_change`, 542 → `state_change`. |
| B1-S3 | **M3 partial-fail, usage_records has no lifecycle states** | `usage_records` (108) is a `master + required` data_object on SUB-MGMT-SUBSCRIPTIONS but `data_object_lifecycle_states` is empty for it. Rule #12 requires every master+required to either carry lifecycle states or surface the config-shape exemption. Usage records do have a real lifecycle (posted → rated → billed → reconciled), or alternatively they could be config-shape (immutable append-only event log). Flagship metering vendors (Metronome, Orb, Lago) model usage events as immutable append-only records with a separate rating/aggregation phase; the lifecycle is then concentrated on aggregated `usage_summaries` or `rated_usage_charges`, not on individual events. | Recommended: author 4 lifecycle states for `usage_records`: `posted` (state_order 1, no permission), `rated` (state_order 2, requires_permission=true on module 167), `billed` (state_order 3, terminal=false), `reversed` (state_order 4, terminal=true). Alternative: surface as config-shape exemption to user (B2-S1 records the decision). Agent default is to author the 4 states. |
| B1-S4 | **B9b hard-fail, 0 intra-domain handoffs on 2-module domain** | Catalog has 0 rows where `source_domain_id=target_domain_id=97`. SUB-MGMT clearly exchanges events between SUB-MGMT-BILLING (168) and SUB-MGMT-SUBSCRIPTIONS (167): (a) `customer_invoice.past_due` (494) BILLING→SUBSCRIPTIONS transitions `customer_subscriptions.active → past_due` (state 388); (b) `customer_invoice.paid` (493) BILLING→SUBSCRIPTIONS transitions `customer_subscriptions.past_due → active`; (c) `subscription.activated` (129) SUBSCRIPTIONS→BILLING triggers the first invoice (creates a `customer_invoice` row); (d) `subscription.renewal_required` (156) SUBSCRIPTIONS→BILLING triggers the recurring invoice run; (e) `dunning.escalation` (155) BILLING→SUBSCRIPTIONS feeds `customer_subscriptions.suspended` (state 389); (f) `usage_record.overage_detected` (496) SUBSCRIPTIONS→BILLING triggers an overage invoice line. | Author 6 intra-domain handoff rows with `source_domain_id=target_domain_id=97`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`, populating both module FKs per the routing above. Three (a, c, e) need new trigger_event_id values that already exist (494, 129, 155); three (b, d, f) reuse 493, 156, 496. No new trigger_events required for the 6 intra-domain handoffs themselves. |
| B1-S5 | **E2/E3 hard-fail, Phase E never ran on SUB-MGMT** | Catalog has 0 `permissions` rows linked to modules 167 or 168, 0 SUB-MGMT-scoped `roles`, 0 `role_modules` bindings. Per Rule #14 + the per-domain checklist Phase E, each full module needs the three baseline permissions (`sub-mgmt-subscriptions:read`, `:manage`, `:admin` and `sub-mgmt-billing:read`, `:manage`, `:admin`) plus the workflow-gate permissions derived from lifecycle states with `requires_permission=true` (currently 2: `customer_invoice.issued` state 381 → `issue_customer_invoice`; `revenue_recognition_record.recognized` state 403 on module 89 PSA-PROJECT-FINANCIALS, this last one actually realizes on PSA so it's NOT a SUB-MGMT permission). Roles candidate set from the flagship-vendor surface: BILLING-OPS-MANAGER, SUBSCRIPTION-OPERATOR, REVENUE-RECOGNITION-ANALYST, DUNNING-COLLECTIONS-SPECIALIST. | Author 6 baseline permissions + 1 workflow-gate permission (`sub-mgmt-billing:issue_customer_invoice` for state 381) + 4 roles + role_modules bindings + permission_hierarchy edges (`:admin → :manage → :read` per module). Significant Phase E load; agent default is to author the canonical four-role bundle per the flagship-vendor surface. Loader pattern: `scripts/loaders/`-style phase-E loader. |
| B1-S6 | **F2 hard-fail, 0 system skills on SUB-MGMT modules** | Modules 167 (SUB-MGMT-SUBSCRIPTIONS) and 168 (SUB-MGMT-BILLING) each need exactly one `skills` row with `skill_type='system'`, `domain_module_id=<module>` (Rule #17). Both have zero. F3/F4/F5 cannot evaluate without F2 satisfied; SUB-MGMT's Semantius score is uncomputable. Hosted starter HVAC-SVC-MGMT (171) already carries its own system skill 236, not a SUB-MGMT concern. | Author 2 system skills: `sub_mgmt_subscriptions_agent` (linked to 167) and `sub_mgmt_billing_agent` (linked to 168). Each needs `skill_tools` rows: query_customer_subscriptions, query_usage_records, query_revenue_recognition_records, mutate_customer_subscription_state, compute_mrr_arr, side_effect_send_renewal_notice for module 167; query_customer_invoices, query_dunning_events, mutate_customer_invoice_state, side_effect_send_invoice, side_effect_send_dunning_notice, compute_collections_aging, inbound_payment_webhook for module 168. Each module's tool roster needs Rule #17 invariants (operation_kind ↔ data_object_id pairing). Significant Phase F load. |

#### Bucket 1 sub-categorization

| Finding type | Count |
|---|---|
| STRUCTURAL (B10b.1 + B9 events + M3 + B9b + E + F) | 6 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY (NULL FK or missing handoff) | covered by B1-S1 + B1-S4 above |
| APQC TAGGING (per-handoff PCF activity classification) | 1 finding covering 29 handoffs |
| MODULARIZATION | 0 in Bucket 1 (routed to Bucket 3) |

#### APQC TAGGING (B1-H1)

7 of 29 cross-domain handoffs carry `handoff_processes` tags. Catalog quality (headline): **0 `record_status='approved'`**. Process health (side-bar): 2 `agent_curated`, 3 `discovery_substring`, 2 `discovery_override`. Volume expectation per SKILL H1: 0.5N to 0.8N for N=29 → 15 to 23 `agent_curated` tags. The audit proposes the following candidates from the structural-pass model:

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | confidence |
|---|---|---|---|---|---|
| 64 | SUB-MGMT-SUBSCRIPTIONS → CRM (CRM-ACCT-MGT) | `subscription.activated` | `customers` | Manage customer accounts (10183 or child) | confident L3 |
| 65 | SUB-MGMT-SUBSCRIPTIONS → CSM | `subscription.activated` | `customer_entitlements` | Manage customer service inquiries (10388) or Manage product and service requirements (10063) | confident L3 |
| 72 | SUB-MGMT-BILLING → CSM | `payment.failed` | `customer_cases` | (existing `discovery_override` row 1422 "Process and distribute payments" 10862 looks weak: this is a CSM-side case, not an AP payment activity. Propose REPLACE with "Manage customer service problems, requests, and inquiries" 10388) | medium |
| 194 | SUB-MGMT-BILLING → CSM | `dunning.escalation` | `dunning_events` | Manage collections (16432) or Manage customer service inquiries (10388) | confident L3 |
| 195 | SUB-MGMT-SUBSCRIPTIONS → CSM | `subscription.renewal_required` | `customer_subscriptions` | Manage customer accounts (10183) or Develop customer retention strategies | confident L3 |
| 196 | SUB-MGMT-SUBSCRIPTIONS → CRM (CRM-ACCT-MGT) | `subscription.downgraded` | `customer_subscriptions` | Manage customer accounts (10183) | confident L3 |
| 197 | SUB-MGMT-SUBSCRIPTIONS → ERP-FIN | `revenue.recognised` | `revenue_recognition_records` | (existing `discovery_substring` row 55 "Perform revenue accounting" 10729 looks reasonable; propose REPLACE-with-agent_curated confirmation) | confident L2 |
| 490 | SUB-MGMT-SUBSCRIPTIONS → CRM (CRM-ACCT-MGT) | `subscription.upgraded` | `customer_subscriptions` | Manage customer accounts (10183) or Develop customer retention strategies | confident L3 |
| 491 | SUB-MGMT-BILLING → ERP-FIN | `customer_invoice.issued` | `customer_invoices` | Process accounts receivable (10747 or child) | confident L3 |
| 492 | SUB-MGMT-BILLING → B2C-COMM | `customer_invoice.issued` | `customer_invoices` | Process customer payments (10803 or child) | medium |
| 493 | SUB-MGMT-BILLING → CSM | `customer_invoice.past_due` | `customer_invoices` | Manage collections (16432) or Manage customer service inquiries | confident L3 |
| 494 | SUB-MGMT-SUBSCRIPTIONS → CSM | `subscription.cancelled` | `customer_subscriptions` | Manage customer service problems, requests, and inquiries (10388) | confident L3 |
| 495 | SUB-MGMT-SUBSCRIPTIONS → ERP-FIN | `usage_record.overage_detected` | `usage_records` | Perform revenue accounting (10729 or Manage product and service master data) | medium |
| 496 | SUB-MGMT-SUBSCRIPTIONS → CSM | `usage_record.overage_detected` | `usage_records` | Manage customer accounts (10183) or Process customer service requests | medium |
| 63 | CLM (CLM-REPOSITORY) → SUB-MGMT | `legal_contract.signed` | `customer_subscriptions` | (existing `agent_curated` row 148 "Manage customers and accounts" 10183, keep as-is, advise approval) | confident L3 |
| 67 | B2C-COMM → SUB-MGMT | `order.subscription_purchase` | `customer_subscriptions` | (existing `discovery_override` row 150 "Manage sales orders" 10185 looks reasonable; propose REPLACE-with-agent_curated confirmation) | confident L3 |
| 73 | CSM → SUB-MGMT-BILLING | `case.churn_risk_detected` | `dunning_events` | (existing `discovery_override` row 196 "Manage customer service problems" 10388 looks weak: this is a churn-risk dunning intervention, propose REPLACE with "Manage collections" 16432) | medium |
| 224 | CSM → SUB-MGMT | `health_score.declined` | `customers` | Manage customer satisfaction / Develop customer retention strategies | confident L3 |
| 233 | CSM → SUB-MGMT | `customer.churn_confirmed` | `customers` | (existing `discovery_substring` row 6 "Manage Customer Service" 20085 L1; too broad. Propose REPLACE with "Manage customer retention" or "Manage customer accounts" 10183) | medium |
| 234 | CSM → SUB-MGMT | `subscription.expansion_requested` | `customers` | Manage customer accounts (10183) or Process upsell opportunities | confident L3 |
| 271 | MDM → SUB-MGMT | `customer_golden_record.created` | `customers` | Manage master data (10741 or child) or Manage customer accounts | confident L3 |
| 331 | B2C-COMM → SUB-MGMT | `commerce_order.placed` | `commerce_orders` | Manage sales orders (10185) | confident L3 |
| 471 | CRM (CRM-PIPELINE-MGT) → SUB-MGMT | `crm_opportunity.closed_won` | `crm_opportunities` | Sell products and services (10004 or child) | confident L3 |
| 485 | CPQ → SUB-MGMT | `sales_quote.accepted_by_buyer` | `sales_quotes` | Develop and manage sales proposals (11779) | confident L3 |
| 489 | CSM → SUB-MGMT | `customer_entitlement.depleted` | `customer_entitlements` | Manage customer accounts (10183) or Manage product and service requirements | confident L3 |
| 519 | CLM (CLM-REPOSITORY) → SUB-MGMT | `legal_contract.signed` | `legal_contracts` | (existing `agent_curated` row 166 "Order materials and services" 10279, this looks weak for SUB-MGMT context; propose REPLACE with "Manage customer accounts" 10183) | medium |
| 687 | BI → SUB-MGMT | `bi_subscription.delivery_failed` | `bi_subscriptions` | Manage IT services (10566 or child) | medium |
| 750 | APIM → SUB-MGMT | `api_usage.quota_breached` | `api_usage_metrics` | Manage IT services (10566 or child) or Process customer billing | medium |

29 candidate APQC tags total. **Recommended action shape:** 22 INSERT new `agent_curated` rows + 4 REPLACE existing `discovery_substring` / `discovery_override` rows with `agent_curated` rows that swap the PCF process (72, 73, 233, 519) + 3 CONFIRM existing rows with `agent_curated` approval (63, 67, 197). The PCF id column requires `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` lookups at fix time.

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | PATCH 14 outbound handoffs to populate `source_domain_module_id` (B10b.1) |
| B1-S2 | PATCH 7 trigger_events to set `event_category` (B9) |
| B1-S3 | Author 4 lifecycle states for `usage_records` OR surface config-shape exemption (M3); see B2-S1 |
| B1-S4 | Author 6 intra-domain cross-module handoff rows (B9b) |
| B1-S5 | Phase E load: 6 baseline permissions + 1 workflow-gate permission + 4 roles + role_modules + permission_hierarchy |
| B1-S6 | Phase F load: 2 system skills + ~13 skill_tools rows |
| B1-H1 | APQC TAGGING, propose 29 `agent_curated` rows (22 INSERT + 4 REPLACE + 3 CONFIRM) |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **usage_records lifecycle vs config-shape exemption (M3).** B1-S3 proposes 4 lifecycle states (posted, rated, billed, reversed). Alternative: declare `usage_records` config-shape per Rule #12 exemption (immutable append-only event log; rating + billing live on a separate aggregated entity that does not yet exist). Modern usage-metering vendors (Metronome, Orb, Lago) actually do the latter, the event is immutable; an aggregated `rated_usage_charges` or `usage_summaries` entity holds the lifecycle. Choice depends on whether the user wants SUB-MGMT to introduce a second master entity (Bucket 3 candidate) or fold rating into `usage_records` itself. | Architectural intent question; user owns. | (a) Author the 4 lifecycle states on `usage_records` (B1-S3 agent default). (b) Declare config-shape and surface the gap (rating + billing lifecycle then lives on a new master, see Bucket 3 entity candidate `rated_usage_charges`). |
| B2-S2 | **Pattern flags on SUB-MGMT masters (B4).** All 5 masters currently have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Reasonable candidates per the workflow shapes: (a) `customer_invoices.has_submit_lock=true` (once issued, an invoice's line items are immutable; re-issuing means voiding + new draft); (b) `customer_invoices.has_personal_content=true` (carries bill-to address, possibly personal email, payment method last-4); (c) `customer_subscriptions.has_personal_content=true` (carries the billing contact, may include personal address); (d) `revenue_recognition_records.has_submit_lock=true` (once recognized, immutable per ASC 606 audit trail); (e) `dunning_events.has_personal_content=true` (collection notices carry payer contact). | Pattern flags are workflow-shape judgments; agent re-evaluates and proposes, user decides per Rule #12 + Rule #15 (no auto-population). | Per-flag yes/no from user; capture in Decisions. |
| B2-S3 | **`certification_required=false` on a SOX/ASC 606 domain.** Domain row metadata sets `certification_required=false`. However, ASC 606 compliance (revenue recognition) under SOX requires that material implementations of subscription billing for public companies be auditor-reviewed; many vendors (Maxio SaaSOptics, Sage Intacct ARC, RightRev) are explicitly marketed on SOX-compliance grounds. Should `certification_required` flip to `true`? Or is the field reserved for product-level certification (Finanzamt/GoBD, FDA 510(k), banking-regulator licensure) and an audit-trail-quality requirement does not qualify? | Definitional boundary between "implementation needs auditor sign-off" and "product needs formal certification". | (a) Keep `certification_required=false`; SOX audit is buyer-side. (b) Flip to `true` reflecting the public-company sales reality. (c) Add a new column at catalog level for "auditor-attestable" separate from "certified". |
| B2-S4 | **Zero `domain_regulations` rows on a heavily-regulated domain.** SUB-MGMT has no regulation joins. Flagship vendors universally call out: ASC 606 (FASB), IFRS 15 (IASB), SOX (PCAOB), PCI-DSS (PCI SSC, indirect via payment processors), GDPR (EU, customer PII on subscription records), and US state sales-tax nexus rules. Currently the catalog has no record of these regulations at all on SUB-MGMT. | Audit-time decision: which regulations to author or join. The candidate set is broad and the agent cannot guess applicability scope per row without user input. | (a) Add 5 `domain_regulations` joins on existing regulation rows if they exist (ASC 606, IFRS 15, SOX, PCI-DSS, GDPR). (b) Skip pending Phase 0. (c) Specify a subset. The agent will check existing `regulations` rows at fix time. |
| B2-S5 | **Capability split intent (SUB-LIFECYCLE vs SUB-USAGE-METER vs SUB-REV-REC).** SUB-MGMT-SUBSCRIPTIONS hosts 5 capabilities: SUB-LIFECYCLE, SUB-USAGE-METER, SUB-REV-REC, SUB-CHURN-ANALYTICS, SUB-ENT-MGT. Three of these (SUB-USAGE-METER, SUB-REV-REC, possibly SUB-CHURN-ANALYTICS) are vendor-by-vendor distinct point-solution markets (Metronome / Orb / Lago for metering; Maxio SaaSOptics / RightRev for rev-rec; ChartMogul / SaaSGrid for analytics). Compressing them into a single SUB-MGMT-SUBSCRIPTIONS module hides the modularization. Should SUB-MGMT remain a 2-module domain, or should the audit recommend a Bucket 3 modularization split (e.g. SUB-MGMT-USAGE-METER, SUB-MGMT-REV-REC, SUB-MGMT-ANALYTICS)? | Module-split judgment with downstream blast radius (capability rebinding, DMDO re-routing). Agent recommends Bucket 3 surfaces 3 candidate modules; user decides whether SUB-MGMT absorbs them or whether they spin out as separate domains (see Bucket 3 + the queued `_missing-domains.md` candidates USAGE-METERING and REV-REC). | (a) Keep SUB-MGMT as 2 modules; metering + rev-rec live as capabilities only. (b) Split into 3-5 modules under SUB-MGMT; capability rebinding required. (c) Spin out USAGE-METERING and REV-REC as separate domains per Bucket 3 candidates (queued in `_missing-domains.md`). |
| B2-S6 | **HVAC-SVC-MGMT starter hosting on SUB-MGMT via host-junction.** Starter 171 is hosted on SUB-MGMT via `domain_module_host_domains` even though SUB-MGMT and FSM (the starter's primary host) overlap only on `customer_invoices`. The starter embeds 10 data_objects, only `customer_invoices` is a SUB-MGMT master. Why the SUB-MGMT host membership? Possibly because HVAC-SVC-MGMT bundles recurring service contracts that need invoicing. Is this intentional or a load-time mis-attribution? | Editorial / product intent question. | (a) Intentional, the HVAC starter ships with the SUB-MGMT billing flow embedded. (b) Mis-attribution, remove the SUB-MGMT host_domain row. (c) Refactor: the starter should consume the SUB-MGMT-BILLING module rather than embed customer_invoices, requires the SUB-MGMT domain to be installed alongside. |

### Bucket 3, Phase 0 pending (speculative)

Pass 2 ran the flagship-vendor enumeration against Stripe Billing, Zuora Billing and Revenue, Chargebee, Recurly, Maxio (Chargify + SaaSOptics), Aria Systems, Salesforce Revenue Cloud Subscription Management, OneBill, Sage Intacct Subscription Billing, Younium, Solvimon, Metronome, Orb, Lago, Amberflo, RightRev. The compliance anchor is ASC 606 / IFRS 15; broader anchors that warrant consideration: SOX, PCI-DSS, GDPR, US state sales-tax nexus (Wayfair v. South Dakota), EU VAT MOSS, and ePrivacy (for dunning email channels). Each candidate below is a candidate gap for Phase 0 verification, not a vetted finding.

#### MISSING (5) in-domain entity candidates surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `subscription_plans` | Every flagship vendor masters a plan catalog distinct from the subscription instance (Stripe: Products + Prices; Zuora: Product Catalog; Chargebee: Plans + Addons; Recurly: Plans). Current SUB-MGMT has no `subscription_plans` master; the plan is implicit on `customer_subscriptions`. | new master in SUB-MGMT-SUBSCRIPTIONS |
| `payment_methods` | Stripe, Zuora, Chargebee, Recurly all master payment methods on the customer level (card / ACH / SEPA / wallet) with PCI-grade tokenization. Currently no `payment_methods` entity. | new master in SUB-MGMT-BILLING (or punted to PAYMENT-PROCESSING domain candidate, see queued `_missing-domains.md` row) |
| `rated_usage_charges` | If `usage_records` stays config-shape (B2-S1 option b), an aggregated `rated_usage_charges` master is needed to carry the lifecycle (rated → billed → reconciled). Modern usage-metering platforms (Metronome, Orb, Lago) build the whole product on this 2-entity split. | new master in SUB-MGMT-SUBSCRIPTIONS (or USAGE-METERING domain candidate, see queued row) |
| `tax_calculations` | Every billing platform persists tax-determination outcomes per invoice line (rate, jurisdiction, sourcing rule). Currently no `tax_calculations` entity; tax lives implicitly inside `customer_invoices`. | new master in SUB-MGMT-BILLING (or punted to SALES-TAX domain candidate, see queued row) |
| `proration_credits` | Mid-cycle upgrades / downgrades generate proration credit records distinct from invoice line items. Stripe and Chargebee model these explicitly (Chargebee "Credit Notes" with proration kind). Currently no entity. | new master in SUB-MGMT-BILLING |

#### MODULARIZATION (3) candidates

- **Split SUB-MGMT-SUBSCRIPTIONS into SUB-MGMT-LIFECYCLE and SUB-MGMT-USAGE-METERING.** SUB-LIFECYCLE and SUB-USAGE-METER are two different point-solution markets (Zuora Billing vs Metronome / Orb / Lago). Combining them in one module conflates two distinct deployable surfaces with different lifecycle entities (subscription state machine vs usage event log). Depends on B2-S5.
- **Split SUB-MGMT-SUBSCRIPTIONS into SUB-MGMT-LIFECYCLE and SUB-MGMT-REV-REC.** Revenue recognition has its own lifecycle (pending → recognized → reversed), its own master (`revenue_recognition_records`), and its own vendor surface (RightRev, Maxio SaaSOptics, Sage Intacct ARC). Combining it with subscription lifecycle hides that. Depends on B2-S5.
- **Promote SUB-CHURN-ANALYTICS into a sibling SUB-MGMT-ANALYTICS module.** Subscription analytics (ChartMogul, SaaSGrid, Baremetrics) is a recognized point-solution market and would need its own master entity (`subscription_metric_snapshots`) plus a derived-tier system skill set. Currently embedded as a capability without an entity backing it.

#### Candidate-domain queue

This audit surfaced **4 domain-tier candidates** for `audits/_missing-domains.md`, all queued via the helper:

- **USAGE-METERING** (Metronome, Orb, Lago, Amberflo, m3ter), event ingestion + real-time aggregation + rating engines. Adjacent to SUB-MGMT, FINOPS, APIM, CPQ.
- **SALES-TAX** (Avalara, Vertex, Sovos, TaxJar, Anrok, Stripe Tax), real-time tax determination + nexus tracking + jurisdictional filing. Adjacent to SUB-MGMT, ERP-FIN, B2C-COMM, CPQ.
- **PAYMENT-PROCESSING** (Stripe Payments, Adyen, Braintree, Worldpay, Spreedly, Primer), card vaulting + payment orchestration + chargeback management. Adjacent to SUB-MGMT, B2C-COMM, ERP-FIN, AP-AUTO.
- **REV-REC** (Maxio SaaSOptics, Sage Intacct ARC, Leeyo Zuora RevPro, RightRev, Trullion), ASC 606 performance-obligation modeling + deferred revenue waterfall + RevRec audit trails. Adjacent to SUB-MGMT, ERP-FIN, CPQ, AUDIT.

#### Compliance regulation candidates (no entity proposed, regulation rows missing on SUB-MGMT)

- **ASC 606** (FASB) revenue recognition standard.
- **IFRS 15** (IASB) international revenue recognition standard.
- **SOX** controls for public-company subscription revenue (significant-contract attestation, audit trail).
- **PCI-DSS** for payment data handling (indirect via processor but still in scope).
- **GDPR** for EU subscriber personal data on billing records.
- **EU VAT MOSS** for cross-border digital services taxation.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces `c:/tmp/SUB-MGMT-phase0-<date>.md` confirming per-entity vendor coverage and per-regulation applicability scoping) or eyeball-mode (user names which of the 5 entity candidates + 3 modularization candidates + 4 candidate domains + 6 regulations to treat as confirmed).

### Cross-bucket dependencies

- **B1-S3** is **gated on B2-S1**: lifecycle authoring vs config-shape exemption decision must come from the user before the M3 fix loads.
- **B1-S5 (Phase E load)** is **partially gated on B2-S5**: if the user chooses to split SUB-MGMT-SUBSCRIPTIONS into multiple modules (option b), the role-module bindings change shape. Recommend resolving B2-S5 first.
- **B1-S6 (Phase F load)** depends on B1-S5 (the skill_tools roster mirrors the workflow-gate permissions, which depend on roles + permissions being authored first).
- **B1-S4 (intra-domain handoffs)** is independent of all other buckets; the 6 handoff rows use existing trigger_events.
- **B1-S1 (B10b.1 PATCH)** and **B1-S2 (event_category PATCH)** are mechanical and independent of everything else.
- **B3 entity candidates** (`subscription_plans`, `rated_usage_charges`, `tax_calculations`, `payment_methods`) **inform B2-S5** (the modularization question is essentially "do these candidates live as SUB-MGMT masters or as new-domain masters?"). Calling this out per the surface-time discipline.
- **B2-S6 (HVAC starter intent)** is **independent** but creates work for the FSM domain audit if the starter needs refactoring.
- Otherwise Buckets 2 and 3 are independent of each other; the user can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S2, S4, H1`), or `skip`.

- **S1 (B10b.1 PATCH on 14 outbound handoffs)** is trivial; one PATCH per row.
- **S2 (event_category PATCH on 7 events)** is trivial; one PATCH each.
- **S3 (usage_records lifecycle)** is gated on B2-S1; resolve that first.
- **S4 (6 new intra-domain handoffs)** is structural; no dependencies on other buckets.
- **S5 (Phase E load)** is gated on B2-S5; resolve that first if you want to split modules before authoring permissions / roles.
- **S6 (Phase F load)** depends on S5.
- **H1 (29 APQC tags including 4 REPLACE candidates)** load now or in a follow-up batch?

**Bucket 2, what's your call on each?** I will wait for per-item decisions before acting.

- **B2-S1 (usage_records lifecycle vs config-shape):** (a) author the 4 states, (b) declare config-shape and queue `rated_usage_charges` as a new master.
- **B2-S2 (pattern flag re-evaluation):** per-flag yes/no on the 5 proposed flips.
- **B2-S3 (certification_required):** keep false, flip to true, or add a new "auditor-attestable" column.
- **B2-S4 (regulations seeding):** which subset of (ASC 606, IFRS 15, SOX, PCI-DSS, GDPR) to join, or skip pending Phase 0.
- **B2-S5 (capability / module split):** keep 2 modules, split into 3-5 SUB-MGMT modules, or spin out USAGE-METERING / REV-REC as separate domains per the queued candidates.
- **B2-S6 (HVAC starter intent):** intentional, mis-attribution, or refactor.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 5 entity candidates + 3 modularization candidates + 4 candidate domains + 6 regulations to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| CSM | B10b.2: populate `target_domain_module_id` on inbound handoffs 65, 72, 194, 195, 493, 494, 496 (all NULL). Several of these point at CSM-CASE-MGMT (112) or CSM-ENTITLEMENTS (113) but the audit cannot disambiguate without CSM b1. Existing DMDOs (CSM-CASE-MGMT optional consumer + CSM-ENTITLEMENTS required consumer on `customer_subscriptions`) match the audit's expectation. |
| CSM | B10b.1: populate `source_domain_module_id` on outbound-from-CSM handoffs 73, 224, 233, 234, 489 (all NULL on the source side). |
| CRM | B10b.2: populate `target_domain_module_id` on inbound 196 (`subscription.downgraded` lands in CRM-ACCT-MGT 46 since that module already consumes `customer_subscriptions`; the existing handoff just doesn't have the FK). Also 64, 490 already have `target_domain_module_id=46` populated; audit only 196 needs the fix. |
| ERP-FIN | B10b.2: populate `target_domain_module_id` on outbound-from-SUB-MGMT handoffs 197, 491, 495 (all NULL on the target side). ERP-FIN appears in the catalog-wide b2 audit as a "Phase B never run" domain (0 DMDO rows); the FK populate needs the ERP-FIN modules to exist first. Add `consumer + required` DMDO rows on `customer_invoices` (107) and `revenue_recognition_records` (109) on the receiving ERP-FIN AR / RevRec modules. |
| B2C-COMM | B10b.1: populate `source_domain_module_id` on inbound 67, 331. B10b.2: populate `target_domain_module_id` on outbound 492. Add `consumer` DMDO on `customer_invoices` (107) on the receiving B2C-COMM module. |
| CLM | B10b.2: populate `target_domain_module_id` on inbound 63 and 519 (both `legal_contract.signed` from CLM-REPOSITORY into SUB-MGMT). CLM's audit already surfaced these as outbound NULL B10b.2 work owed by SUB-MGMT, but SUB-MGMT actually owns the target FK per the B10b asymmetry: SUB-MGMT-SUBSCRIPTIONS (167) is the natural target for 63 (`customer_subscriptions` payload) and SUB-MGMT-BILLING (168) is plausible for 519 (`legal_contracts` payload, but it lands on rev-rec context). **Move to B1-S1 follow-up:** PATCH 63 set `target_domain_module_id=167`; PATCH 519 set `target_domain_module_id=167` (since `legal_contracts` triggers a subscription creation downstream). Note: SUB-MGMT did NOT have these flagged in B1-S1 because B1-S1 enumerates outbound from SUB-MGMT, not inbound. These two add to B1-S1's PATCH list as **B1-S1b** if the user approves. |
| MDM | B10b.1: populate `source_domain_module_id` on inbound 271 (`customer_golden_record.created`). Add `consumer` DMDO on `customers` (97) if MDM masters them. |
| BI | B10b.1: populate `source_domain_module_id` on inbound 687 (`bi_subscription.delivery_failed`). |
| APIM | B10b.1: populate `source_domain_module_id` on inbound 750 (`api_usage.quota_breached`). |
| CPQ | B10b.1: populate `source_domain_module_id` on inbound 485 (`sales_quote.accepted_by_buyer`). |
| PSA | Optional: confirm whether PSA-PROJECT-FINANCIALS (module 89) should remain `contributor + required` on `revenue_recognition_records` (109), or whether the relationship should be reshaped as a handoff (PSA → SUB-MGMT on `project_billing_milestone.reached` feeding rev-rec, not contributing directly to the master). |

### Decisions

_(empty, pending user review)_

### Fixes applied

_(empty, pending Bucket 1 approval)_

### `domains.notes` pointer

_(empty, pending user-supplied wording per Rule #15)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

Technical-only residual pass per the residual-pass instruction set. Loader: `c:/dev/domain-map/.tmp_deploy/fix_sub_mgmt_b1_technical_2026_05_31.ts` (run from project root).

### Applied

| Fix ID | Type | Count | Detail |
|---|---|---|---|
| B1-S1 | B10b FK PATCH (source_domain_module_id) | 13 deterministic + 1 audit-named | handoffs 64, 65, 195, 196, 197, 490, 494, 495, 496 → 167; handoffs 194, 491, 492, 493 → 168 deterministic via event-DO → strongest SUB-MGMT master role. Handoff 72 (`payment.failed`, payload `customer_cases` DO 103) is not derivable from a SUB-MGMT-owned event DO; applied 72→168 per audit pre-specification (BILLING is the conceptual emitter; `customer_cases` is the CSM-side payload). |
| B1-S1b | B10b FK PATCH (target_domain_module_id) | 1 | handoff 63 (CLM-REPOSITORY → SUB-MGMT, payload `customer_subscriptions` DO 106) → 167 deterministic via payload-DO → master. |
| B1-S2 | enum backfill on `trigger_events.event_category` | 7 | 492/493/494 → `state_change`; 495 → `lifecycle`; 496 → `threshold`; 541/542 → `state_change`. Per Rule #13 enum vocabulary. |

Post-fix audit: all 14 outbound handoffs carry `source_domain_module_id`; handoff 63 carries `target_domain_module_id=167`; zero empty `event_category` on the 7 targeted trigger_events.

### Deferred (out of TECHNICAL scope for this residual pass)

| Fix ID | Why deferred |
|---|---|
| B1-S3 | gated on B2-S1 (user owns lifecycle-vs-config-shape decision for `usage_records`). |
| B1-S4 | new `handoffs` row inserts are not in the residual-pass TECHNICAL apply scope. |
| B1-S5 | full Phase E permissions/roles/role_modules/permission_hierarchy load; also gated on B2-S5. |
| B1-S6 | full Phase F system skills + skill_tools load; also depends on S5. |
| B1-H1 | 29 APQC `handoff_processes` candidates have no pre-specified PCF IDs; PCF resolution requires fix-time `/processes` lookups and several REPLACE/CONFIRM judgments the technical pass cannot make. |
| B1-S1b (handoff 519) | payload `legal_contracts` DO 66 not mastered in any SUB-MGMT module; audit's 519→167 is editorial pre-specification (downstream subscription-creation context), not derivable from existing SUB-MGMT modules. |

JWT errors: none.

## 2026-05-31, Audit

### Summary

Fresh Validate b1 structural audit (mode b1, structural pass) re-run after the same-day technical residual pass landed B1-S1 (B10b source-side, 14 PATCH), B1-S1b (handoff 63 target-side, 1 PATCH), and B1-S2 (event_category backfill, 7 PATCH). Bucket 3 and the semantic / market pass from 2026-05-30 are NOT re-derived here, this is the structural pass only, residual Bucket 1 / 2 items from the 2026-05-30 audit are reclassified against current live state. Footprint counts re-derived from live: 2 full modules (167 SUB-MGMT-SUBSCRIPTIONS, 168 SUB-MGMT-BILLING), 1 hosted starter (171 HVAC-SVC-MGMT primary host FSM), 5 SUB-MGMT-domain masters (106, 107, 108, 109, 110), 8 capabilities, 10 solutions all primary, 14 trigger_events on the 5 masters (all 14 now carry a valid event_category), 14 outbound + 14 inbound cross-domain handoffs (28 cross-domain total), still 0 intra-domain handoffs, 0 aliases, 20 lifecycle states across 4 of 5 masters, 0 permissions and 0 roles on modules 167/168, 1 legacy domain-level system skill (108 `sub-mgmt-system` with 7 skill_tools rows) and 0 module-level system skills on 167/168, 10 of 28 cross-domain handoffs carry a `handoff_processes` row (0 `record_status='approved'`, 5 `agent_curated`, 2 `discovery_substring`, 3 `discovery_override`).

- Bucket 1 (in-scope, agent fixable): 9 items
- Bucket 2 (surface-for-user, judgment): 6 items (carried forward from 2026-05-30 with current-state notes)
- Bucket 3 (Phase 0 pending, speculative): unchanged from 2026-05-30, not re-derived this pass

JWT errors: none.

Em-dash flagged on a SUB-MGMT row (Rule "No em-dashes" in CLAUDE.md): `domains.id=97 business_logic` contains the U+2014 character. Not auto-patched; surfaced as B1-S9 below.

### Structural pass bands

| Band | Verdict | Detail |
|---|---|---|
| A1 (domain metadata) | pass | crud_percentage=55, business_logic non-empty (contains em-dash, see B1-S9), min_org_size, cost_band, certification_required, usa_market_size_usd_m=2500, market_size_source_year=2025 all populated. |
| A2 (capabilities) | pass | 8 rows. |
| A3 (solutions) | pass | 10 solutions all `coverage_level=primary`. |
| A4 (catalog UX on domain) | FAIL | `domains.catalog_tagline` and `domains.catalog_description` both empty on id 97. See B1-S7'. |
| A5 | skipped | not requested. |
| M1 (>=1 full module) | pass | 167 + 168 + hosted starter 171. |
| M2 (>=2 modules on >=3 cap domain) | pass | 8 capabilities, 2 full modules. |
| M4 (every capability has a realizing module) | pass | 8 of 8 SUB-MGMT capabilities bound via domain_module_capabilities. |
| M5 (workflow-gate states carry domain_module_id) | PARTIAL | state 403 `revenue_recognition_records.recognized` carries domain_module_id=89 (PSA-PROJECT-FINANCIALS), matches the cross-domain realization. state 381 `customer_invoices.issued` is `requires_permission=true` with permission_verb_override=`issue_invoice` but carries `domain_module_id=NULL`, realizing module is 168 (SUB-MGMT-BILLING) since 168 masters `customer_invoices`. See B1-S8. |
| M6 (every module realizes >=1 capability) | pass | 167 has 5, 168 has 3, 171 has 6 (FSM caps). |
| M7 (single-master integrity) | pass | each of the 5 SUB-MGMT masters has exactly one `role=master` row; `customer_invoices` (107) is co-embedded by hosted starter 171 as `embedded_master`, expected per Rule #19. |
| M8 (catalog UX on modules) | FAIL | both 167 and 168 have empty `catalog_tagline` and `catalog_description`. See B1-S7'. |
| B5 (embedded_master integrity) | pass | 11 embedded_master rows on hosted starter 171, every payload data_object_id has a canonical master (107 in module 168, 97 in CRM-ACCT-MGT, 98 in CRM-CONTACT-MGT, etc.) or is platform_builtin (`users` 748). |
| B7 (users edges) | not enumerated in this pass | report-only. |
| B9 (outbound trigger_events + handoffs) | pass | all 14 trigger_events on SUB-MGMT masters now carry a non-empty event_category. 14 outbound handoffs cover the published events. |
| B9b (intra-domain cross-module handoffs) | FAIL | 0 rows where source_domain_id=target_domain_id=97. Audit-predicted 6 intra-domain pairs remain unauthored. See B1-S3 carry-forward. |
| B10b.1 source-side | pass | all 14 outbound handoffs carry source_domain_module_id. |
| B10b.2 target-side (this domain's inbound) | report-only | handoff 63 now carries target_domain_module_id=167. 13 of 14 inbound handoffs still carry `target_domain_module_id=NULL`. Per B10b asymmetry, target-side NULLs on inbound rows are owed by source domains' B10b.2 follow-ups. Listed below. |
| B11 (aliases) | FAIL | 0 alias rows on 106, 107, 108, 109, 110. See B1-S5. |
| B12 (lifecycle states) | PARTIAL | 7 states on 106, 6 on 107, 0 on 108, 3 on 109, 4 on 110. `usage_records` (108) carries zero lifecycle states. Rule #12 obligation unresolved, gated on B2-S1. |
| C1 (business_function_domains) | pass | owner=Accounts Receivable, contributor=Sales. |
| C2 (capability function overrides) | not in scope this pass | no overrides authored. |
| D1 (UI spot-check) | not run | no writes this pass. |
| E1 (role coverage) | FAIL | 0 role_modules rows on modules 167 / 168. Phase E never ran on SUB-MGMT. |
| E2 (2-module floor) | n/a | no roles exist. |
| E3 (interaction_level) | n/a | no rows. |
| E4 (role_permissions bundle) | n/a | no rows. |
| E5 (Path A / Path B agree) | n/a | no rows. |
| F1 (no legacy domain-level system skill) | FAIL | skill 108 `sub-mgmt-system` exists with `domain_id=97`, `domain_module_id=null`, `skill_type=system`. Per F1, retire once any module-level system skill ships. See B1-S7 (Phase F). |
| F2 (one system skill per module) | FAIL | 0 system skills on 167 / 168. |
| F3 / F4 / F5 | blocked on F2 | uncomputable Semantius score until F2 satisfied. Legacy skill 108 carries 7 skill_tools rows, all `coverage_tier=platform` (strict_score 1.0 on the legacy skill if not retired). |
| H1 (APQC tagging) | FAIL | 10 of 28 cross-domain handoffs tagged. 0 at `record_status=approved`. Process-target floor of 0.5 * 28 = 14 agent_curated rows not met. |

SUB-MGMT Semantius score: uncomputable until F2 lands (legacy skill 108 is retired by F1).

### Bucket 1, In-scope confirmed gaps

#### Carry-forward items (residual scope from 2026-05-30)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S3 | B9b hard-fail, 0 intra-domain handoffs on a 2-module domain | Unchanged since 2026-05-30. SUB-MGMT-BILLING (168) and SUB-MGMT-SUBSCRIPTIONS (167) must exchange events for (a) `customer_invoice.past_due` event 494 BILLING to SUBSCRIPTIONS driving state 388 `past_due`, (b) `customer_invoice.paid` event 493 BILLING to SUBSCRIPTIONS driving return-to-active, (c) `subscription.activated` event 129 SUBSCRIPTIONS to BILLING firing first invoice, (d) `subscription.renewal_required` event 156 SUBSCRIPTIONS to BILLING firing recurring invoice, (e) `dunning.escalation` event 155 BILLING to SUBSCRIPTIONS feeding suspension state 389, (f) `usage_record.overage_detected` event 496 SUBSCRIPTIONS to BILLING triggering overage line. | INSERT 6 `handoffs` rows with `source_domain_id=target_domain_id=97`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`, both module FKs per the routing. No new trigger_events. |
| B1-S4 | B12 partial-fail, usage_records has no lifecycle states | Gated on B2-S1. Agent default: author 4 states (posted, rated, billed, reversed) on 108. Alternative: declare config-shape. | Either INSERT 4 `data_object_lifecycle_states` rows OR surface config-shape exemption (no notes write per Rule #15). |
| B1-S5 | B11 fail, 0 aliases on 5 masters | Candidate aliases (draft, surface-for-confirm): `customer_subscriptions` -> `subscriptions`, `recurring_charges`, `subscription_records`; `customer_invoices` -> `invoices`, `bills`, `customer_bills`; `usage_records` -> `usage_events`, `metered_events`, `meter_readings`; `revenue_recognition_records` -> `revrec_records`, `deferred_revenue_schedules`, `performance_obligation_records`; `dunning_events` -> `dunning_notices`, `collections_events`, `payment_recovery_events`. | INSERT ~15 `data_object_aliases` rows after user surface-for-confirm. Loader pattern: standard chunked POST. |
| B1-S6 (Phase E) | E1-E5 fail, Phase E never ran | Author 6 baseline permissions (`sub-mgmt-subscriptions:read|manage|admin` and `sub-mgmt-billing:read|manage|admin`), 1 workflow-gate permission `sub-mgmt-billing:issue_invoice` materializing state 381 after the M5 fix lands, 4 candidate roles (BILLING-OPS-MANAGER, SUBSCRIPTION-OPERATOR, REVENUE-RECOGNITION-ANALYST, DUNNING-COLLECTIONS-SPECIALIST), role_modules + role_permissions + permission_hierarchy. | Phase E loader. Partially gated on B2-S5 (module split). |
| B1-S7 (Phase F) | F1 + F2 fail | Author 2 module-level `skills` rows (`sub_mgmt_subscriptions_agent` on 167, `sub_mgmt_billing_agent` on 168), ~13 skill_tools rows split across the two skills, then DELETE legacy skill 108 + its 7 skill_tools rows (F1 retirement). Legacy `skill_tools` transfer mostly verbatim: 167 inherits query_customer_subscriptions, query_usage_records, query_revenue_recognition_records, query_customers; 168 inherits query_customer_invoices, query_dunning_events, send_email; both add module-specific mutate / compute / inbound primitives per Rule #17. | Phase F loader. Depends partially on B1-S6 (workflow-gate permissions inform tool roster). |
| B1-H1 (APQC) | H1 fail | 18 untagged handoffs need `agent_curated` rows; 4 existing rows are REPLACE candidates (handoffs 72, 73, 233, 519); 4 are CONFIRM-with-agent_curated candidates (63, 67, 197, 485). PCF id resolution requires fix-time `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` lookups. Candidate PCF mapping from 2026-05-30 stands. | INSERT 18 + REPLACE 4 + CONFIRM 4. |

#### New items surfaced by this pass

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S8 | M5 partial-fail, customer_invoices.issued state has no domain_module_id | state 381 (`customer_invoices.issued`, `requires_permission=true`, `permission_verb_override='issue_invoice'`) carries `domain_module_id=NULL`. Module 168 (SUB-MGMT-BILLING) is the canonical master of `customer_invoices` and the realizing module. Without M5 the materialized permission lands without a module prefix. | PATCH state 381 set `domain_module_id=168`. |
| B1-S7' | A4 + M8 fail, catalog UX fields empty on domain and both full modules | `domains.id=97 catalog_tagline` and `catalog_description` both empty; `domain_modules.id=167` and `id=168` same. Buyer-voice draft needed for all six fields per Rule #20. | Draft 3 tagline + 3 description pairs (domain + each full module). Surface to user BEFORE writing per Rule #20. (Numbered with apostrophe to avoid clash with the Phase F carry-forward.) |
| B1-S9 | em-dash in `domains.business_logic` on id 97 | `business_logic` value contains the literal em-dash character U+2014. CLAUDE.md "No em-dashes" rule forbids the character everywhere. The fact-sheet emitter sanitises at render time as a safety net but source must stay clean. | PATCH `business_logic` to rewrite without an em-dash. Surface the exact replacement string for user approval before PATCH; A1 currently passes on this field so the rewrite is voluntary cleanup. |

#### Bucket 1 sub-categorization

| Finding type | Count |
|---|---|
| STRUCTURAL (M5 + M8 + A4 + B9b + B11 + B12 + E + F + Rule violation) | 8 (B1-S3, B1-S4, B1-S5, B1-S6, B1-S7, B1-S7', B1-S8, B1-S9) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY (NULL FK or missing handoff) | covered above (B1-S3 + B1-S8) |
| APQC TAGGING | 1 finding covering 26 candidates across 28 handoffs (10 already tagged, 18 untagged, 4 REPLACE candidates inside the 10 already-tagged) |
| MODULARIZATION | 0 in Bucket 1, routed to Bucket 2 / 3 |

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S3 | B9b hard-fail, INSERT 6 intra-domain handoff rows (carry-forward) |
| B1-S4 | B12 partial-fail, INSERT 4 lifecycle states on usage_records OR declare config-shape (carry-forward, gated on B2-S1) |
| B1-S5 | B11 fail, INSERT ~15 `data_object_aliases` rows after user surface-for-confirm (carry-forward) |
| B1-S6 | Phase E load, 7 permissions + 4 roles + role_modules + role_permissions + permission_hierarchy (carry-forward, partially gated on B2-S5) |
| B1-S7 | Phase F load, 2 system skills + ~13 skill_tools rows + DELETE legacy skill 108 once new skills land (carry-forward, depends on B1-S6) |
| B1-S7' | A4 + M8 fail, draft + write 3 catalog_tagline + catalog_description pairs (new this pass) |
| B1-S8 | M5 partial-fail, PATCH state 381 set domain_module_id=168 (new this pass) |
| B1-S9 | Rule violation, PATCH `domains.business_logic` on id 97 to remove em-dash (new this pass) |
| B1-H1 | APQC TAGGING, 18 INSERT + 4 REPLACE + 4 CONFIRM (carry-forward) |

### Bucket 2, Surface-for-user (judgment calls)

Carried forward from 2026-05-30 unchanged. Brief restatement only, see prior section for full options text.

| ID | Question | Current-state note |
|---|---|---|
| B2-S1 | `usage_records` lifecycle vs config-shape exemption. Gates B1-S4. | unchanged. |
| B2-S2 | Pattern flag re-evaluation across 5 masters (5 candidate flips). | unchanged. Per Rule #15, NO auto-population; per-flag yes/no required. |
| B2-S3 | `certification_required=false` on a SOX / ASC 606 domain, keep / flip / new column. | unchanged. |
| B2-S4 | 0 `domain_regulations` rows. Author ASC 606 / IFRS 15 / SOX / PCI-DSS / GDPR? | unchanged, current count remains 0. |
| B2-S5 | Capability split, keep 2 modules or split into 3-5 / spin out USAGE-METERING / REV-REC. | unchanged. Gates B1-S6 partially. |
| B2-S6 | HVAC starter on SUB-MGMT host junction, intentional / mis-attribution / refactor. | unchanged, junction row still present on hosted starter 171. |

### Bucket 3, Phase 0 pending (speculative)

Not re-derived this pass. The 2026-05-30 audit enumerated 5 in-domain entity candidates (`subscription_plans`, `payment_methods`, `rated_usage_charges`, `tax_calculations`, `proration_credits`), 3 modularization candidates, 4 candidate-domain queue entries (USAGE-METERING, SALES-TAX, PAYMENT-PROCESSING, REV-REC), and 6 compliance regulation candidates. All carry forward unchanged in state.yaml.

### Cross-bucket dependencies

- B1-S4 gated on B2-S1 (lifecycle vs config-shape decision for `usage_records`).
- B1-S6 partially gated on B2-S5 (module split decision changes role / role_modules shape).
- B1-S7 depends on B1-S6 (workflow-gate permissions inform tool roster).
- B1-S8 is independent and mechanical (one PATCH on state 381).
- B1-S9 is independent (one PATCH on domain 97 after user-approved wording).
- B1-S7' (catalog UX) is independent but needs user-approved draft surface BEFORE write.
- B1-S5 (aliases) needs user surface-for-confirm on the candidate alias names BEFORE write.
- B1-S3 (intra-domain handoffs) is structural and independent.
- B1-H1 PCF id resolution happens at fix time.
- B3 entity candidates inform B2-S5.

### Report-only follow-ups, owed by other domains

13 of 14 inbound handoffs to SUB-MGMT still carry `target_domain_module_id=NULL`. Per B10b asymmetry, these are owed by the source domains' B10b.2 follow-ups, not SUB-MGMT's fix surface.

| Owing domain | Owed work |
|---|---|
| CSM | B10b.1: populate `source_domain_module_id` on outbound-from-CSM handoffs 73, 224, 233, 234, 489. B10b.2 mirror on target side of 65, 72, 194, 195, 493, 494, 496 once routing module known. |
| CRM | B10b.2 mirror on inbound 196 (payload `customer_subscriptions`). Handoffs 64 and 490 already carry target_domain_module_id=46 (CRM-ACCT-MGT). |
| ERP-FIN | B10b.2 mirror on outbound-from-SUB-MGMT 197, 491, 495 (NULL target). ERP-FIN modularization remains a precondition. |
| B2C-COMM | B10b.1 mirror on inbound 67, 331. B10b.2 mirror on outbound 492. |
| CLM | B10b.2 mirror on inbound 519 (NULL target, payload `legal_contracts` 66). Handoff 63 carries target_domain_module_id=167. |
| MDM | B10b.1 mirror on inbound 271 (NULL source). |
| BI | B10b.1 mirror on inbound 687. |
| APIM | B10b.1 mirror on inbound 750. |
| CPQ | B10b.1 mirror on inbound 485. |
| PSA | Optional: confirm PSA-PROJECT-FINANCIALS (module 89) contributor + required on `revenue_recognition_records` (109), or reshape as a handoff. |

### Decisions

_(empty, pending user review)_

### Fixes applied

_(none this pass, structural Validate b1 only)_

### `domains.notes` pointer

_(empty, pending user-supplied wording per Rule #15)_

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.

---

## 2026-06-06 - Audit (state-driven execute)

State-driven Validate execute pass over SUB-MGMT (domain 97) open state.yaml items. Worked only the open worklist, no fresh from-scratch audit. Loader: `c:/dev/domain-map/.tmp_deploy/sub_mgmt_validate_2026_06_06.ts` (run from project root; idempotent, verified no-op on re-run). All writes landed at `record_status='new'`; no `notes` column written anywhere. No JWT errors.

### Summary

Re-verified every state.yaml item against live state before acting (the 2026-05-31 snapshot was stale on B1B-H1: six handoffs listed there as "untagged" already carried agent_curated tags). Executed all five open EXECUTE b1a items plus the two additive b1b items (B1B-S5 aliases, B1B-H1 net-new tags). Surfaced the destructive and decision-gated work. Left the blocked b1b item and the b3 backlog.

### Executed (all record_status='new')

| Item | Table | Count | Detail |
|---|---|---|---|
| B1A-S3 | handoffs | 6 inserted | Intra-domain cross-module rows (source=target=97, integration_pattern='lifecycle_progression', friction_level='low'), ids 1368-1373. Routing a-f exactly per state.yaml: (a) 168->167 te494 do106; (b) 168->167 te493 do106; (c) 167->168 te129 do107; (d) 167->168 te156 do107; (e) 168->167 te155 do106; (f) 167->168 te496 do108. Reused existing trigger_events; none pre-existed. |
| B1A-S8 | data_object_lifecycle_states | 1 patched | State 381 (customer_invoices.issued) domain_module_id NULL -> 168 (SUB-MGMT-BILLING, canonical master of customer_invoices). Verified NULL before patch. |
| B1A-S7-PRIME | domains + domain_modules | 3 patched (6 fields) | Buyer-voice catalog_tagline + catalog_description authored for domain 97 and modules 167, 168. All six fields were empty; patched empty-only (no overwrite). No vendor names, no em-dash, American English. Current Rule #20 empty-field author path used (record_status carries the review signal); the old surface-before-write gate in the state was stale. |
| B1A-ENTITY-TYPE | data_objects | 5 patched | 106 customer_subscriptions -> operational_workflow; 107 customer_invoices -> operational_workflow; 108 usage_records -> operational_record; 109 revenue_recognition_records -> operational_workflow; 110 dunning_events -> operational_workflow. All were 'unclassified'. 108 classified operational_record (append-only metered event log) is decision-neutral: B12 passes either way and B2-S1 stays open (option a would re-classify to operational_workflow). |
| B1B-S5 | data_object_aliases | 15 inserted | Net-new generic synonyms (alias_type='synonym'), full candidate set: customer_subscriptions {subscriptions, recurring_charges, subscription_records}; customer_invoices {invoices, bills, customer_bills}; usage_records {usage_events, metered_events, meter_readings}; revenue_recognition_records {revrec_records, deferred_revenue_schedules, performance_obligation_records}; dunning_events {dunning_notices, collections_events, payment_recovery_events}. No aliases pre-existed. No brand names. |
| B1B-H1 (net-new) | handoff_processes | 13 inserted | agent_curated, role='implements', on the genuinely-untagged cross-domain handoffs. PCF processes resolved live this pass (apqc_pcf_cross_industry): 148 Manage customers and accounts (10183) -> handoffs 64,195,196,490,224,234,471,489; 196 Manage customer service problems/requests/inquiries (10388) -> 65,494; 304 Manage and process collections (10745) -> 194,493; 719 Manage customer master data (14208) -> 271. Six handoffs the snapshot called untagged (331,491,492,495,687,750) were already agent_curated live and were skipped (net-new only). |

### Surfaced (no write; user-gated)

- B1A-S9 (em-dash, DESTRUCTIVE): domains.id=97 business_logic contains a U+2014 em-dash ("tax determination - regulated and irreducible"). Drafted colon replacement: "Revenue recognition under ASC 606/IFRS 15, proration, dunning logic, usage rating, and tax determination: regulated and irreducible." Not patched (overwrites a non-empty value).
- B1A-PHASE-P (personas, DEFERRED): 2-module domain, 0 personas (E1 fail). Authoring is entangled with the open B2-S5 module-split decision; recommend authoring after B2-S5 resolves. Candidate personas: BILLING-OPS-MANAGER, SUBSCRIPTION-OPERATOR, REVENUE-RECOGNITION-ANALYST, DUNNING-COLLECTIONS-SPECIALIST.
- B1B-H1 RESIDUAL: 4 REPLACE (destructive delete+insert) handoffs 72 (1422->196), 73 (196->304), 233 (6->148), 519 (166->148); 4 CONFIRM (record_status flip, Rule #1 user-only) handoffs 63, 67, 197, 485. None touched.
- B1B-S-TOOLS-MIGRATION (superseded reframe): B1B-S6/B1B-S7 are SUPERSEDED (retired per-module skill grain). Did NOT delete skill 108. The real follow-up is a later Phase-S migration of skill 108's legacy skill_tools onto domain_module_tools for modules 167/168 so F3/F5 evaluate.
- All open b2 (B2-S1 usage_records lifecycle, B2-S2 pattern flags, B2-S3 certification_required, B2-S4 domain_regulations, B2-S5 module split / spin-out, B2-S6 HVAC starter hosting): restated with options.

### Left

- B1B-S4: blocked on B2-S1. Note: 108 now operational_record, so B12 already passes; B1B-S4 is now purely the "add a lifecycle?" architectural question, not a structural gap.
- All b3 (entity candidates, modularization splits, candidate domains, regulation joins): backlog, unchanged.

### State

next_action_by flipped agent -> user (all agent-executable additive/corrective work is done; remaining items are destructive-awaiting-approval, decision-gated, or scheduled for a later phase).
