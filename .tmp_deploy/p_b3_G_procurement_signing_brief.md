# Phase B3 cluster brief — G_procurement_signing

**Domains:** S2P, ESIGN — author lifecycle states + pattern flags for every master+required data_object listed below.

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

### Domain S2P — Source-to-Pay (id 27)

> End-to-end procurement workflows from sourcing through purchase order to payment.

#### goods_receipts

- **Plural label:** Goods Receipts · **Singular:** Goods Receipt
- **Description:** Confirmation that ordered goods or services were received as expected: receipt date, quantity received, condition. The basis for 3-way matching against PO + invoice that AP runs before payment.
- **Relationships (≤12):** goods_receipts —signals→ supplier_scorecards (one_to_many)

#### purchase_orders

- **Plural label:** Purchase Orders · **Singular:** Purchase Order
- **Description:** Issued PO to a supplier: line items, agreed prices, delivery terms, payment terms, ship-to / bill-to. Authorises the supplier to deliver. PO creation is a primary trigger for downstream system updates — ITAM gets the asset reference, SMP gets the SaaS subscription anchor.
- **Relationships (≤12):** hardware_warranties —renews_via→ purchase_orders (one_to_many); asset_contracts —fulfilled_by→ purchase_orders (one_to_many); legal_contracts —triggers_creation_of→ purchase_orders (one_to_many); supplier_qualifications —gates→ purchase_orders (one_to_many)

#### purchase_requisitions

- **Plural label:** Purchase Requisitions · **Singular:** Purchase Requisition
- **Description:** Internal demand for a purchase: what's needed, who's requesting, justification, budget reference, approval state. The origination point of a procurement workflow; SMP-triggered shadow-IT sanctioning lands here.
- **Relationships (≤12):** spare_parts_inventory —requisitions→ purchase_requisitions (one_to_many); legal_contracts —triggers_review_in→ purchase_requisitions (one_to_many)

#### sourcing_events

- **Plural label:** Sourcing Events · **Singular:** Sourcing Event
- **Description:** RFx process record: RFI, RFQ, RFP, or reverse auction. Carries scope, supplier list, scorecard / weighting, responses, and the awarded supplier. The pre-contract stage that produces a sourcing decision feeding CLM.
- **Relationships (≤12):** sourcing_events —originates→ legal_contracts (one_to_many); suppliers —enables→ sourcing_events (one_to_many)

#### supplier_invoices

- **Plural label:** Invoices · **Singular:** Invoice
- **Description:** Supplier-issued invoice for goods or services delivered. AP runs 3-way match (PO + receipt + invoice) before approving for payment. Multi-domain consumption: EXPENSE consumes when a corporate card path overlaps, FINOPS consumes the cloud-invoice slice for cost allocation.
- **Relationships (≤12):** contingent_invoices —flows_into→ supplier_invoices (one_to_many); supplier_invoices —reimbursed via invoice→ expense_lines (one_to_many); expense_reports —becomes→ supplier_invoices (one_to_one)

### Domain ESIGN — Electronic Signature (id 94)

> Legally-binding electronic signature capture, identity verification, and audit trails for digital agreements. Vendors: DocuSign, Adobe Acrobat Sign, Dropbox Sign (HelloSign), OneSpan, Sertifi, signNow, Yousign, PandaDoc Sign, Notarize, Proof.

#### envelopes

- **Plural label:** Envelopes · **Singular:** Envelope
- **Description:** An e-signature transaction wrapping one or more signature requests against a contract or document. Lifecycle: created → sent → in_progress → completed (or declined / voided / expired). Distinct from CLM's signature_records (the legal-side authoritative record of signed agreements); ESIGN's envelopes capture the e-sign-platform lifecycle while CLM consumes the completed result.
- **Master slice notes:** ESIGN masters the e-signature envelope lifecycle (vendor-side: DocuSign, Adobe Sign, etc.); CLM consumes completed envelopes as input to its signature_records.
- **Relationships (≤12):** envelopes —yields→ signature_records (one_to_many)
