# Phase B3 cluster brief — E_customer

**Domains:** CRM, CSM, FSM — author lifecycle states + pattern flags for every master+required data_object listed below.

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

### Domain CRM — Customer Relationship Management (id 69)

> Sales force automation, opportunity and pipeline management, account/contact management, and B2B/B2C customer lifecycle. Distinct from CSM (post-sale service) and MA (marketing). Vendors: Salesforce Sales Cloud, HubSpot Sales Hub, Microsoft Dynamics 365 Sales, Oracle Sales, SAP Sales Cloud, Zoho CRM, Pipedrive, SugarCRM, Creatio.

#### crm_contacts

- **Plural label:** Contacts · **Singular:** Contact
- **Description:** Person at a customer account (B2B) or contact-level record (B2C-relevant). Carries title, email, decision-maker flag, preferred channel, opt-in state. MA contributes engagement data; SALES-ENG contributes cadence touchpoints.

#### crm_leads

- **Plural label:** Leads · **Singular:** Lead
- **Description:** Pre-qualification prospect record — source, score, status (new/working/qualified/disqualified/converted), assigned rep, conversion target (which contact + account it would become). MQL handoff from MA lands here.

#### crm_opportunities

- **Plural label:** Opportunities · **Singular:** Opportunity
- **Description:** Active sales deal — stage, amount, close date, probability, products/SKUs, competitor, decision criteria. Drives CPQ quote generation and closed-won triggers downstream subscription activation.
- **Relationships (≤12):** customers —flags_churn_risk_on→ crm_opportunities (one_to_many); crm_opportunities —is activity context for→ customer_cases (one_to_many); crm_opportunities —opens→ customer_cases (one_to_many); legal_contracts —renewal_warns→ crm_opportunities (one_to_many); crm_opportunities —drafts→ legal_contracts (one_to_many)

#### customers

- **Plural label:** Customers · **Singular:** Customer
- **Description:** Canonical record of a customer — account (B2B) or end-customer (B2C). Carries identity, segmentation, lifecycle stage, account hierarchy, and pointers to opportunities, cases, subscriptions, and unified profile. The flagship customer-facing entity and the catalog's most multi-mastered row: CRM masters the sales view, CSM the service view, SUB-MGMT the financial view, CDP the unified resolved profile. The structural twin of `employees` on the customer side.
- **Aliases:** account (synonym); client (synonym)
- **Relationships (≤12):** customers —raises→ customer_cases (one_to_many, req); customers —holds→ customer_entitlements (one_to_many); customers —subscribes_to→ customer_subscriptions (one_to_many); users —owns→ customers (one_to_many); customers —flags_churn_risk_on→ crm_opportunities (one_to_many); customer_subscriptions —adjusts dunning for→ customers (one_to_many); msp_contracts —drives engagement→ customers (one_to_many); customer_golden_records —resolves to→ customers (one_to_many); customers —feedback_routed_from→ customer_feedback_items (one_to_many); customers —impacted_by→ product_features (many_to_many); customers —impacted_by→ product_releases (many_to_many); customers —tracked_by→ product_metrics (many_to_many)

#### pipeline_stages

- **Plural label:** Pipeline Stages · **Singular:** Pipeline Stage
- **Description:** Sales-process taxonomy: stage definitions, exit criteria, default probability, allowed-next-stage transitions. The configuration object behind the opportunity pipeline.

#### sales_activities

- **Plural label:** Sales Activities · **Singular:** Sales Activity
- **Description:** Logged touchpoint between sales and a contact/opportunity — call, email, meeting, demo, content view. SALES-ENG sub-domain may co-master if its data_objects load expands later (cadence sequences, call recordings).

### Domain CSM — Customer Service Management (id 30)

> Case management, omnichannel engagement, and self-service for external customer support.

#### csat_responses

- **Plural label:** CSAT Responses · **Singular:** CSAT Response
- **Description:** Customer satisfaction, NPS, or CES survey response tied to a case, interaction, or relationship-level survey. Drives retention scoring and feeds churn-risk signals back to SUB-MGMT and account-health into CRM.
- **Aliases:** satisfaction survey (synonym); customer feedback (synonym)
- **Relationships (≤12):** customer_cases —generates→ csat_responses (one_to_many); users —submitted→ csat_responses (one_to_many)

#### customer_cases

- **Plural label:** Customer Cases · **Singular:** Customer Case
- **Description:** Customer-facing support ticket — the flagship CSM entity. Distinct from ITSM `incidents` (internal IT) and `service_requests` (catalog-driven internal requests). Carries severity, channel, queue, SLA clock, customer + contact references, CSAT linkage. SUB-MGMT-driven dunning failures and CSM-detected churn risk both surface as cases.
- **Aliases:** ticket (synonym); support case (synonym)
- **Relationships (≤12):** customers —raises→ customer_cases (one_to_many, req); customer_cases —generates→ csat_responses (one_to_many); customer_cases —emits→ customer_events (one_to_many); customer_cases —references→ knowledge_articles (many_to_many); customer_entitlements —consumed_by→ customer_cases (one_to_many); users —is assignee for→ customer_cases (one_to_many); users —created→ customer_cases (one_to_many); crm_opportunities —is activity context for→ customer_cases (one_to_many); customer_invoices —opens→ customer_cases (one_to_many); support_sessions —escalates to→ customer_cases (one_to_many); social_messages —triages into→ customer_cases (one_to_many); social_mentions —triages into→ customer_cases (one_to_many)

#### customer_entitlements

- **Plural label:** Customer Entitlements · **Singular:** Customer Entitlement
- **Description:** What support a customer can use — service tier (Silver/Gold/Platinum), monthly support hours, supported channels (email/chat/phone), named contacts, included services, SLA response targets. Activated from the SUB-MGMT subscription.activated handoff.
- **Aliases:** service entitlement (synonym); support contract (synonym)
- **Relationships (≤12):** customers —holds→ customer_entitlements (one_to_many); legal_contracts —governs→ customer_entitlements (one_to_many); customer_entitlements —consumed_by→ customer_cases (one_to_many); users —owns→ customer_entitlements (one_to_many); customer_subscriptions —provisions→ customer_entitlements (one_to_many)

#### customers

- **Plural label:** Customers · **Singular:** Customer
- **Description:** Canonical record of a customer — account (B2B) or end-customer (B2C). Carries identity, segmentation, lifecycle stage, account hierarchy, and pointers to opportunities, cases, subscriptions, and unified profile. The flagship customer-facing entity and the catalog's most multi-mastered row: CRM masters the sales view, CSM the service view, SUB-MGMT the financial view, CDP the unified resolved profile. The structural twin of `employees` on the customer side.
- **Master slice notes:** Service view — owns the case history, entitlements, SLAs, CSAT, support contracts associated with the customer. Co-master alongside CRM (sales view), SUB-MGMT (financial view), and CDP (unified profile).
- **Aliases:** account (synonym); client (synonym)
- **Relationships (≤12):** customers —raises→ customer_cases (one_to_many, req); customers —holds→ customer_entitlements (one_to_many); customers —subscribes_to→ customer_subscriptions (one_to_many); users —owns→ customers (one_to_many); customers —flags_churn_risk_on→ crm_opportunities (one_to_many); customer_subscriptions —adjusts dunning for→ customers (one_to_many); msp_contracts —drives engagement→ customers (one_to_many); customer_golden_records —resolves to→ customers (one_to_many); customers —feedback_routed_from→ customer_feedback_items (one_to_many); customers —impacted_by→ product_features (many_to_many); customers —impacted_by→ product_releases (many_to_many); customers —tracked_by→ product_metrics (many_to_many)

### Domain FSM — Field Service Management (id 31)

> Dispatch, scheduling, mobile work order, and parts management for on-site service technicians.

#### dispatch_records

- **Plural label:** Dispatch Records · **Singular:** Dispatch Record
- **Description:** An assignment of a work_order to a specific technician at a specific time. Captures dispatch decisions, route optimization output, dispatcher overrides. Audit trail for what was assigned to whom and why.
- **Master slice notes:** FSM-side dispatch artifact; technician schedule and customer comm are downstream.
- **Relationships (≤12):** dispatch_records —opens→ customer_cases (one_to_many)

#### field_visits

- **Plural label:** Field Visits · **Singular:** Field Visit
- **Description:** A scheduled or completed on-site visit by a field technician. Captures arrival, departure, work performed, parts used, customer signature, outcome. Distinct from work_orders (the demand-side artifact); a single work_order may produce multiple field_visits if the work spans days or requires re-dispatch.
- **Master slice notes:** FSM master; CSM and asset-lifecycle consume on visit completion.
- **Relationships (≤12):** field_visits —opens→ customer_cases (one_to_many)

#### service_contracts

- **Plural label:** Service Contracts · **Singular:** Service Contract
- **Description:** SLA-bearing service contract (response time, parts coverage, call-out fees) — distinct from CLM canonical contracts.

#### service_work_orders

- **Plural label:** Service Work Orders · **Singular:** Service Work Order
- **Description:** Customer-facing service job request fulfilled by field visits — distinct from VMS preventive-maintenance work orders.
- **Relationships (≤12):** service_work_orders —opens→ customer_cases (one_to_many)
