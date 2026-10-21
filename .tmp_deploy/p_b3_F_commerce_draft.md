# Phase B3 cluster draft — F_commerce

Lifecycle states + pattern flags for OMS, CPQ, and SUB-MGMT data_objects.

## Domain OMS — Order Management

### inventory_locations

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### order_allocations

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| pending | 1 | true | false | false | _ | Allocation requested but not yet routed to a stock location. |
| allocated | 2 | false | false | false | _ | Inventory reserved at the chosen warehouse/store/3PL. |
| released | 3 | false | true | false | _ | Allocation released to the fulfillment leg (pick/pack/ship). |
| cancelled | 4 | false | true | false | _ | Allocation cancelled before fulfillment; stock returned to available. |

### return_authorizations

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=true

**Justification:** RMA approval is gated by a single returns-desk approver before the refund is authorized.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| requested | 1 | true | false | false | _ | Customer-initiated return request captured by OMS. |
| approved | 2 | false | false | true | approve_return | Returns approver authorizes the RMA and refund eligibility. |
| rejected | 3 | false | true | false | _ | RMA denied (out of policy, ineligible SKU, window expired). |
| received | 4 | false | false | false | _ | Returned goods received at the return location and inspected. |
| refunded | 5 | false | false | false | _ | Refund processed against the original payment instrument. |
| closed | 6 | false | true | false | _ | RMA finalized; no further action expected. |

### sourcing_decisions

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| pending | 1 | true | false | false | _ | Routing engine has not yet produced a sourcing decision. |
| routed | 2 | false | false | false | _ | Line routed to a specific warehouse/store/3PL with rationale. |
| fulfilled | 3 | false | true | false | _ | Sourcing decision honored by the fulfillment leg. |

### store_pickup_orders

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| pending | 1 | true | false | false | _ | Pickup order created; store assignment in progress. |
| ready | 2 | false | false | false | _ | Items staged at the pickup location and held for the customer. |
| picked_up | 3 | false | true | false | _ | Customer collected the order within the hold window. |
| expired | 4 | false | true | false | _ | Hold window elapsed without pickup; order returned to stock. |

## Domain CPQ — Configure-Price-Quote

### contract_drafts

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Draft contract assembled from an approved quote. |
| in_review | 2 | false | false | false | _ | Legal/desk review of clauses, terms, and exceptions. |
| signed | 3 | false | false | false | _ | Counter-signatures collected from both parties. |
| executed | 4 | false | false | false | _ | Contract effective and handed off to CLM/billing. |
| expired | 5 | false | true | false | _ | Contract term elapsed without renewal. |
| terminated | 6 | false | true | false | _ | Contract ended early by either party. |

### discount_approvals

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=true

**Justification:** Each discount request is gated by a single deal-desk/finance approver who accepts or rejects it.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| requested | 1 | true | false | false | _ | Discount request submitted with proposed amount and rationale. |
| approved | 2 | false | true | true | approve_discount | Approver authorizes the discount at the requested level. |
| rejected | 3 | false | true | false | _ | Approver denies the discount request. |

### pricing_rules

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### product_bundles

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### product_configurations

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### quote_discounts

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| proposed | 1 | true | false | false | _ | Discount proposed against a quote line or quote total. |
| pending_approval | 2 | false | false | false | _ | Discount exceeds auto-approve threshold; awaiting approver. |
| approved | 3 | false | false | true | approve_discount | Discount authorized and applied to the quote. |
| rejected | 4 | false | true | false | _ | Discount denied; not applied to the quote. |
| applied | 5 | false | true | false | _ | Discount finalized on the quote and rolled into totals. |

### quote_lines

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### sales_quotes

**Pattern flags:** has_personal_content=false; has_submit_lock=true; has_single_approver=true

**Justification:** Submit for approval locks the quote against further edits; a single approver (deal desk / sales manager) gates the approved transition.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Quote being assembled and priced by the sales rep. |
| submitted_for_approval | 2 | false | false | true | submit_for_approval | Quote locked and routed to the deal-desk approver. |
| approved | 3 | false | false | true | approve_quote | Approver authorizes the quote for presentation to the customer. |
| presented | 4 | false | false | false | _ | Quote delivered to the customer for decision. |
| accepted | 5 | false | true | false | _ | Customer accepted the quote; flows to contract draft. |
| declined | 6 | false | true | false | _ | Customer declined the quote. |
| expired | 7 | false | true | false | _ | Quote validity window elapsed without a decision. |

## Domain SUB-MGMT — Subscription and Revenue Lifecycle Management

### customer_invoices

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Invoice assembled but not yet issued to the customer. |
| issued | 2 | false | false | true | issue_invoice | Invoice finalized and delivered to the customer (AR open). |
| paid | 3 | false | true | false | _ | Invoice settled in full. |
| overdue | 4 | false | false | false | _ | Due date elapsed without payment; dunning may trigger. |
| written_off | 5 | false | true | false | _ | Invoice deemed uncollectible and removed from AR. |
| voided | 6 | false | true | false | _ | Invoice canceled before settlement (correction/reissue). |

### customer_subscriptions

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| trial | 1 | true | false | false | _ | Customer on a free-trial term prior to first billing. |
| active | 2 | false | false | false | _ | Subscription billing on its normal cadence. |
| past_due | 3 | false | false | false | _ | Payment failure detected; subscription in grace period. |
| suspended | 4 | false | false | false | _ | Service suspended pending payment or customer request. |
| cancelled | 5 | false | false | false | _ | Subscription canceled by customer or seller. |
| churned | 6 | false | true | false | _ | Subscription fully ended and no longer billable. |
| reactivated | 7 | false | false | false | _ | Previously cancelled/suspended subscription returned to active. |

### customers

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| prospect | 1 | true | false | false | _ | Customer record exists but no active subscription/invoice yet. |
| active | 2 | false | false | false | _ | Customer has at least one active subscription and is current. |
| past_due | 3 | false | false | false | _ | Customer carries an overdue invoice or failed payment. |
| cancelled | 4 | false | false | false | _ | Customer ended all subscriptions; no active billing. |
| churned | 5 | false | true | false | _ | Customer fully lost; no expected future revenue. |

### dunning_events

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| triggered | 1 | true | false | false | _ | Payment failure or past-due condition opened a dunning event. |
| escalated | 2 | false | false | false | _ | Dunning step escalated (later retry, CSM intervention, collections). |
| resolved | 3 | false | true | false | _ | Payment recovered; dunning closed successfully. |
| written_off | 4 | false | true | false | _ | Collection failed; balance written off and customer flagged. |

### revenue_recognition_records

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| pending | 1 | true | false | false | _ | Performance obligation scheduled but not yet recognized. |
| recognized | 2 | false | false | true | recognize | Revenue recognized in the GL period per ASC 606 / IFRS 15. |
| reversed | 3 | false | true | false | _ | Recognition reversed due to correction, refund, or contract change. |

### usage_records

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false
