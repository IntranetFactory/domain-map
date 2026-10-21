# Phase B3 cluster draft — E_customer

Lifecycle states + pattern flags for every master/required data_object across CRM, CSM, and FSM.

---

## Domain CRM — Customer Relationship Management

### crm_contacts

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| active | 1 | true | false | false | _ | Contact is current and reachable. |
| inactive | 2 | false | false | false | _ | Contact is no longer engaged but record retained. |
| unsubscribed | 3 | false | true | false | _ | Contact has opted out of all channels. |

### crm_leads

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| new | 1 | true | false | false | _ | Freshly captured lead awaiting triage. |
| working | 2 | false | false | false | _ | Sales rep is actively engaging the lead. |
| qualified | 3 | false | false | false | _ | Lead meets qualification criteria and is ready to convert. |
| converted | 4 | false | true | true | convert_lead | Lead has been converted into a contact, account, and opportunity. |
| disqualified | 5 | false | true | false | _ | Lead does not meet criteria; closed without conversion. |

### crm_opportunities

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| open | 1 | true | false | false | _ | Opportunity created and being scoped. |
| qualified | 2 | false | false | false | _ | Opportunity has passed qualification and entered active pursuit. |
| proposal | 3 | false | false | false | _ | Proposal or quote has been delivered to the prospect. |
| negotiation | 4 | false | false | false | _ | Commercial terms are being negotiated with the prospect. |
| won | 5 | false | true | true | close_won | Deal closed-won; triggers downstream subscription activation. |
| lost | 6 | false | true | false | _ | Deal closed-lost; opportunity terminated without revenue. |

### customers

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| prospect | 1 | true | false | false | _ | Pre-customer account being courted by sales. |
| active | 2 | false | false | false | _ | Customer is engaged and in good standing. |
| inactive | 3 | false | false | false | _ | Customer is dormant but not churned. |
| churned | 4 | false | true | false | _ | Customer has terminated the relationship. |

### pipeline_stages

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### sales_activities

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

---

## Domain CSM — Customer Service Management

### csat_responses

**Pattern flags:** has_personal_content=true; has_submit_lock=false; has_single_approver=false

**Justification:** Each response is scoped to the submitting customer/user and visible by default only to the author and case owners.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| pending | 1 | true | false | false | _ | Survey issued, awaiting response from the customer. |
| submitted | 2 | false | true | false | _ | Customer has submitted the survey response. |

### customer_cases

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| new | 1 | true | false | false | _ | Case logged and awaiting assignment. |
| assigned | 2 | false | false | false | _ | Case routed to a specific agent or queue. |
| in_progress | 3 | false | false | false | _ | Agent is actively working the case. |
| pending_customer | 4 | false | false | false | _ | Awaiting customer response or information. |
| resolved | 5 | false | false | true | _ | Agent has applied a resolution; pending customer confirmation. |
| closed | 6 | false | true | true | _ | Case is closed and no further action expected. |

### customer_entitlements

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| active | 1 | true | false | false | _ | Entitlement is in force and consumable by cases. |
| suspended | 2 | false | false | false | _ | Entitlement is temporarily paused (e.g. payment hold). |
| expired | 3 | false | true | false | _ | Entitlement period has ended and is no longer consumable. |

### customers

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| prospect | 1 | true | false | false | _ | Pre-customer account being courted by sales. |
| active | 2 | false | false | false | _ | Customer is engaged and in good standing. |
| inactive | 3 | false | false | false | _ | Customer is dormant but not churned. |
| churned | 4 | false | true | false | _ | Customer has terminated the relationship. |

---

## Domain FSM — Field Service Management

### dispatch_records

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| pending | 1 | true | false | false | _ | Dispatch assignment created, awaiting technician acceptance. |
| dispatched | 2 | false | false | false | _ | Technician has been notified and accepted the assignment. |
| en_route | 3 | false | false | false | _ | Technician is traveling to the customer site. |
| on_site | 4 | false | false | false | _ | Technician has arrived at the customer site. |
| returned | 5 | false | true | false | _ | Technician has departed the site; dispatch closed. |

### field_visits

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| scheduled | 1 | true | false | false | _ | Visit is booked on the technician's calendar. |
| in_progress | 2 | false | false | false | _ | Technician has started the visit on-site. |
| completed | 3 | false | true | false | _ | Visit finished; work performed and signed off. |
| no_show | 4 | false | true | false | _ | Visit could not be performed because customer or technician was absent. |

### service_contracts

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=true

**Justification:** Service contracts require a single named approver (service operations manager) to gate the draft-to-active transition.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Contract is being drafted and not yet binding. |
| active | 2 | false | false | true | _ | Contract is in force and SLAs apply. |
| expired | 3 | false | true | false | _ | Contract term has ended without renewal. |
| renewed | 4 | false | true | false | _ | Contract has been renewed; superseded by a new term. |

### service_work_orders

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| created | 1 | true | false | false | _ | Work order logged, awaiting scheduling. |
| scheduled | 2 | false | false | false | _ | Work order placed on the dispatch schedule. |
| dispatched | 3 | false | false | false | _ | Technician has been assigned and notified. |
| in_progress | 4 | false | false | false | _ | Technician is actively performing the work. |
| completed | 5 | false | false | true | complete_work_order | All work performed and signed off by the customer. |
| invoiced | 6 | false | false | false | _ | Work order has been billed to the customer. |
| closed | 7 | false | true | false | _ | Work order finalized; no further action required. |
| cancelled | 8 | false | true | false | _ | Work order canceled before completion. |
