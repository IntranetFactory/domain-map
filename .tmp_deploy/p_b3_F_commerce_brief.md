# Phase B3 cluster brief — F_commerce

**Domains:** OMS, CPQ, SUB-MGMT — author lifecycle states + pattern flags for every master+required data_object listed below.

## Task

For every entity in this brief, return: (a) lifecycle states (snake_case state_name; state_order; is_initial; is_terminal; requires_permission; permission_verb_override only when needed; one-line description), OR `(static-reference: no lifecycle)` if it's pure reference data (e.g. tax_authorities, recruitment_sources, salary_bands, pricing_rules); AND (b) pattern flags has_personal_content / has_submit_lock / has_single_approver (true/false with one-line justification).

## Output format (strict — the loader parses this)

Use this exact shape per entity:

````
### <data_object_name>

**Pattern flags:** has_personal_content=<true|false>; has_submit_lock=<true|false>; has_single_approver=<true|false>

**Justification:** <one-line rationale covering any flag set to true; if all false write `no behavioral pattern applies`>

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| <snake_case> | <int> | <true|false> | <true|false> | <true|false> | <verb or _> | <one line> |
````

Or, for reference data:

````
### <data_object_name>

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false
````

## Decision guidance

- **`has_personal_content=true`** when row content is per-user-scoped and visibility/edit is row-author-only by default (e.g. `interview_scorecards`, `csat_responses`, `merit_recommendations`, `pay_slips`).
- **`has_submit_lock=true`** when the entity follows draft → submit-then-lock (e.g. `interview_scorecards` lock on submit, `tax_filings` lock once filed, `merit_recommendations` lock on submit).
- **`has_single_approver=true`** when an explicit single approver gates a transition (e.g. `job_offers` need hiring-manager approval, `discount_approvals` need a deal-desk approver, `purchase_requisitions` need a budget approver).
- **`requires_permission=true`** on a lifecycle state when reaching that state needs a workflow gate (`approved`, `submitted`, `hired`, `resolved`, `closed`). The state's verb derives the permission name (`approved → ats:approve_<entity>`, `hired → ats:hire_<entity>`); set `verb_override` only when the natural verb differs from the state name.
- **State naming:** snake_case, past-tense or status-noun (`draft`, `submitted`, `approved`, `active`, `closed`, `cancelled`). Stay consistent across sibling entities in a domain.
- **Static-reference test:** if the entity has no meaningful state transitions beyond `active/inactive` and exists primarily to be referenced as configuration (codes, rules, catalogs, banded data), mark it `static-reference`. Don't invent CRUD states.

## Entities in scope

### Domain OMS — Order Management (id 32)

> Order capture, orchestration, and fulfilment across channels and inventory pools.

#### inventory_locations

- **Plural label:** Inventory Locations · **Singular:** Inventory Location
- **Description:** Stock-location catalog: location_code, type (warehouse / store / 3pl / hub), on_hand, reserved, available_for_allocation. WMS will co-master balances when loaded.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

#### order_allocations

- **Plural label:** Order Allocations · **Singular:** Order Allocation
- **Description:** Inventory-allocation decision per order line across warehouses/stores/3PLs. State: allocated / partially_allocated / backorder_pending. Core OMS function for split orders and cross-dock routing.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass
- **Relationships (≤12):** order_allocations —opens→ customer_cases (one_to_many)

#### return_authorizations

- **Plural label:** Return Authorization (RMA)s · **Singular:** Return Authorization (RMA)
- **Description:** RMA header created by OMS in response to a customer-initiated return or shipment.returned event. Refund_status (pending / authorized / refunded), return_location, tracking.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass
- **Relationships (≤12):** return_authorizations —opens→ customer_cases (one_to_many)

#### sourcing_decisions

- **Plural label:** Sourcing Decisions · **Singular:** Sourcing Decision
- **Description:** OMS routing logic output: which warehouse will fulfill which line, with rationale (lowest_cost / fastest_ship / fulfills_split / 3pl_preference / exception_override) and confidence_score.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

#### store_pickup_orders

- **Plural label:** Store Pickup Orders · **Singular:** Store Pickup Order
- **Description:** B2C-COMM order subcase where fulfillment = store pickup. OMS masters store-assignment and hold-time orchestration: allocated_store_id, hold_window_start/end, pickup_status.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

### Domain CPQ — Configure-Price-Quote (id 73)

> Product configuration, guided selling, pricing, discount approvals, and quote generation. Often packaged with subscription billing under 'Revenue Cloud' or 'Quote-to-Cash'. Vendors: Salesforce Revenue Cloud (CPQ), Conga CPQ, PROS Smart CPQ, Oracle CPQ, SAP CPQ, DealHub, Vendavo.

#### contract_drafts

- **Plural label:** CPQ Contract Drafts · **Singular:** CPQ Contract Draft
- **Description:** Approved-quote handoff artifact; precursor to CLM `contracts`. CPQ owns the draft; CLM owns the signed contract + amendments.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass
- **Relationships (≤12):** contract_templates —published_to→ contract_drafts (one_to_many); contract_drafts —drafts→ legal_contracts (one_to_many)

#### discount_approvals

- **Plural label:** Discount Approvals · **Singular:** Discount Approval
- **Description:** Workflow records gating discount authority: approver (manager / finance / sales-ops), accept/reject.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

#### pricing_rules

- **Plural label:** CPQ Pricing Rules · **Singular:** CPQ Pricing Rule
- **Description:** Calculation engine: tiered/volume discounts, seat-based pricing, duration-based pricing, bundle discounts, segment overrides.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

#### product_bundles

- **Plural label:** Product Bundles · **Singular:** Product Bundle
- **Description:** Reusable package definitions: groups SKUs + mandatory/optional selection rules + bundled-discount rules.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

#### product_configurations

- **Plural label:** Product Configurations · **Singular:** Product Configuration
- **Description:** Captures user selections when building a quote line (options on a base SKU mapping to a variant).
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

#### quote_discounts

- **Plural label:** Quote Discounts · **Singular:** Quote Discount
- **Description:** Line- and quote-level discounts: source (rule / manual / competitive), amount, approval status.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass
- **Relationships (≤12):** quote_discounts —flows into→ legal_contracts (one_to_many)

#### quote_lines

- **Plural label:** Quote Lines · **Singular:** Quote Line
- **Description:** Atomic configured-SKU line: unit price, quantity, line total; bundle nesting; line-level discounts and approval gates.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass

#### sales_quotes

- **Plural label:** Sales Quotes · **Singular:** Sales Quote
- **Description:** Versioned, numbered quote document with quote date, validity, currency, terms, status (draft → presented → accepted → lost), total-price rollup. N:1 to CRM `opportunities`.
- **Master slice notes:** Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass
- **Relationships (≤12):** sales_quotes —drafts→ legal_contracts (one_to_many)

### Domain SUB-MGMT — Subscription and Revenue Lifecycle Management (id 97)

> Recurring billing, subscription lifecycle (upgrades, downgrades, suspensions), revenue recognition, and dunning for subscription and usage-based business models. Vendors: Zuora, Chargebee, Stripe Billing, Recurly, Maxio (Chargify), Aria Systems, SAP Subscription Billing, Salesforce Revenue Cloud, BillingPlatform, Sage Intacct Subscription Billing.

#### customer_invoices

- **Plural label:** Customer Invoices · **Singular:** Customer Invoice
- **Description:** Seller-issued invoice — line items, tax, payment terms, due date, status (draft/sent/paid/overdue/written-off). **AR side**; distinct from S2P `invoices` (AP-side, supplier-issued).
- **Relationships (≤12):** customer_invoices —opens→ customer_cases (one_to_many)

#### customer_subscriptions

- **Plural label:** Customer Subscriptions · **Singular:** Customer Subscription
- **Description:** Customer's recurring revenue contract — plan, term, MRR/ARR, billing cadence, seat count, lifecycle (trial / active / paused / cancelled / churned). **Seller-side view**; distinct from `saas_subscriptions` (SMP, buyer-side view of what we consume from vendors).
- **Relationships (≤12):** customers —subscribes_to→ customer_subscriptions (one_to_many); legal_contracts —backs→ customer_subscriptions (one_to_many); customer_subscriptions —adjusts dunning for→ customers (one_to_many); customer_subscriptions —provisions→ customer_entitlements (one_to_many); legal_contracts —renewed_into→ customer_subscriptions (one_to_many)

#### customers

- **Plural label:** Customers · **Singular:** Customer
- **Description:** Canonical record of a customer — account (B2B) or end-customer (B2C). Carries identity, segmentation, lifecycle stage, account hierarchy, and pointers to opportunities, cases, subscriptions, and unified profile. The flagship customer-facing entity and the catalog's most multi-mastered row: CRM masters the sales view, CSM the service view, SUB-MGMT the financial view, CDP the unified resolved profile. The structural twin of `employees` on the customer side.
- **Master slice notes:** Financial view — owns the recurring revenue relationship: subscriptions, invoices, payment status, churn state, lifetime value. Co-master alongside CRM, CSM, CDP.
- **Aliases:** account (synonym); client (synonym)
- **Relationships (≤12):** customers —raises→ customer_cases (one_to_many, req); customers —holds→ customer_entitlements (one_to_many); customers —subscribes_to→ customer_subscriptions (one_to_many); users —owns→ customers (one_to_many); customers —flags_churn_risk_on→ crm_opportunities (one_to_many); customer_subscriptions —adjusts dunning for→ customers (one_to_many); msp_contracts —drives engagement→ customers (one_to_many); customer_golden_records —resolves to→ customers (one_to_many); customers —feedback_routed_from→ customer_feedback_items (one_to_many); customers —impacted_by→ product_features (many_to_many); customers —impacted_by→ product_releases (many_to_many); customers —tracked_by→ product_metrics (many_to_many)

#### dunning_events

- **Plural label:** Dunning Events · **Singular:** Dunning Event
- **Description:** Payment failure / retry / collection / past-due-warning records driving the involuntary-churn workflow. Surfaces as customer cases when CSM intervention is required; escalates to write-off if collection fails.

#### revenue_recognition_records

- **Plural label:** Revenue Recognition Records · **Singular:** Revenue Recognition Record
- **Description:** ASC 606 / IFRS 15 deferred-revenue schedules: performance obligations, allocation across obligations, recognition timeline, recognized vs deferred amounts. The bridge between SUB-MGMT and Finance/GL.
- **Relationships (≤12):** legal_contracts —feeds_revrec_in→ revenue_recognition_records (one_to_many)

#### usage_records

- **Plural label:** Usage Records · **Singular:** Usage Record
- **Description:** Metered-billing inputs — events / consumption units / overage credits feeding usage-based pricing tiers. Stream from product instrumentation (or B2C-COMM events) into SUB-MGMT for cycle aggregation.
