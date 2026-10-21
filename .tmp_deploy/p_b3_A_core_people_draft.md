# Phase B3 cluster draft — A_core_people

## Domain HCM — Human Capital Management

### employees

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Pre-hire stub created during requisition or onboarding handoff; not yet a worker of record. |
| active | 2 | false | false | true | _ | Worker is currently employed and appears in headcount, payroll eligibility, and directory feeds. |
| on_leave | 3 | false | false | true | _ | Employee is on approved leave (parental, medical, sabbatical); active record but suppressed from some downstream feeds. |
| suspended | 4 | false | false | true | _ | Employment temporarily halted (investigation, disciplinary); pay and access may be paused. |
| terminated | 5 | false | true | true | _ | Employment ended (voluntary or involuntary); final pay processed, access deprovisioned. |

### employment_contracts

**Pattern flags:** has_personal_content=false; has_submit_lock=true; has_single_approver=true

**Justification:** Contracts are drafted then locked on submission for legal review; a single HR or legal approver gates execution before the document becomes binding.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Contract is being authored; terms still editable by HR or hiring manager. |
| submitted | 2 | false | false | true | _ | Locked for review; sent to legal/HR approver for sign-off. |
| approved | 3 | false | false | true | _ | Cleared for execution; ready to be sent to candidate/employee for signature. |
| signed | 4 | false | false | true | _ | Both parties have signed; contract is in force. |
| terminated | 5 | false | true | true | _ | Contract ended (resignation, dismissal, expiry of fixed term, mutual release). |
| superseded | 6 | false | true | true | _ | Replaced by a newer contract (promotion, role change, addendum supplanting prior terms). |

### employment_events

**Pattern flags:** has_personal_content=false; has_submit_lock=true; has_single_approver=true

**Justification:** Personnel actions (hire, promotion, comp change, termination) are drafted then locked on submit; a designated approver (manager, HRBP, or comp committee) gates posting to the worker record.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Event is being prepared (effective date, reason code, new values); editable. |
| submitted | 2 | false | false | true | _ | Locked and routed to the configured approver for the event type. |
| approved | 3 | false | false | true | _ | Approver has signed off; event ready to post to the employee record. |
| posted | 4 | false | true | true | _ | Event applied to the worker record; downstream feeds (payroll, IGA, PA) notified. |
| rejected | 5 | false | true | true | _ | Approver declined; event will not post. Author may clone and re-draft. |
| reversed | 6 | false | true | true | _ | Posted event was reversed by a compensating event after the fact. |

### hcm_positions

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=true

**Justification:** A new position requires single-approver sign-off (finance/headcount owner) before it can be opened for hiring; no draft-lock workflow.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| proposed | 1 | true | false | false | _ | Position has been designed but not yet approved against the headcount plan. |
| approved | 2 | false | false | true | _ | Cleared by headcount/finance owner; eligible to spawn a requisition. |
| open | 3 | false | false | true | _ | Approved and actively being recruited against; not yet filled. |
| filled | 4 | false | false | true | _ | An employee occupies the position. |
| frozen | 5 | false | false | true | _ | Temporarily not fillable (hiring freeze, budget hold); retains the slot. |
| eliminated | 6 | false | true | true | _ | Removed from the org structure permanently. |

### job_profiles

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=true

**Justification:** Catalog entries are reviewed and approved by a comp/HR owner before becoming usable across positions; no per-row draft-lock pattern.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Profile is being authored or revised; not yet available for position assignment. |
| approved | 2 | false | false | true | _ | Cleared by the catalog owner; ready to be referenced by positions and postings. |
| active | 3 | false | false | true | _ | In production use; positions and postings can reference it. |
| retired | 4 | false | true | true | _ | No longer assignable to new positions; historical references preserved. |

### org_units

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Org unit defined as part of a future structure; not yet operational. |
| active | 2 | false | false | true | _ | Operational unit; carries headcount, cost-center linkage, and reporting lines. |
| reorganized | 3 | false | true | true | _ | Unit folded into or replaced by a new structure; references remain for history. |
| closed | 4 | false | true | true | _ | Unit dissolved; no employees or positions reside in it. |

## Domain PAYROLL — Payroll Management

### deduction_codes

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### earning_codes

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### employees

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Payroll record stub; tax setup, bank, and pay group not yet finalized. |
| active | 2 | false | false | true | _ | Eligible for inclusion in pay runs; gross-to-net inputs complete. |
| on_leave | 3 | false | false | true | _ | Worker is on leave; pay treatment per policy (statutory pay, unpaid, top-up). |
| suspended | 4 | false | false | true | _ | Pay suspended pending investigation or administrative hold. |
| terminated | 5 | false | true | true | _ | Final pay processed; no longer included in active pay runs. |

### garnishment_orders

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| received | 1 | true | false | false | _ | Order received from court or agency; pending payroll setup. |
| active | 2 | false | false | true | _ | Order is in force; withholdings are being applied in pay runs. |
| suspended | 3 | false | false | true | _ | Temporarily paused (employee on leave, dispute, statutory hold). |
| released | 4 | false | true | true | _ | Order released by the issuing authority; no further withholdings. |
| exhausted | 5 | false | true | true | _ | Ceiling reached or judgment satisfied; order is closed. |

### pay_runs

**Pattern flags:** has_personal_content=false; has_submit_lock=true; has_single_approver=true

**Justification:** Pay runs follow draft -> submit-then-lock for calculation; a single payroll approver gates the transition from calculated to paid.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Pay run scoped (pay group, country, period); inputs still mutable. |
| calculating | 2 | false | false | true | _ | Gross-to-net engine is running; inputs locked. |
| calculated | 3 | false | false | true | _ | Calculation complete; results available for review and audit. |
| approved | 4 | false | false | true | _ | Payroll approver has signed off; cleared for disbursement and GL posting. |
| paid | 5 | false | false | true | pay_pay_run | Disbursements issued; pay slips published; GL posted. |
| closed | 6 | false | true | true | _ | Period fully closed; tax filings produced; no further adjustments without an off-cycle. |
| cancelled | 7 | false | true | true | _ | Pay run aborted before disbursement; results discarded. |

### pay_slips

**Pattern flags:** has_personal_content=true; has_submit_lock=false; has_single_approver=false

**Justification:** Pay slips are per-employee, row-author-only payable statements; the employee is the default sole reader.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| generated | 1 | true | false | false | _ | Slip produced by the pay run engine; not yet visible to the worker. |
| published | 2 | false | false | true | _ | Released to the worker portal; legally retained per jurisdiction. |
| amended | 3 | false | false | true | _ | Superseded by a corrected slip following an off-cycle or retro adjustment. |
| archived | 4 | false | true | true | _ | Moved to long-term retention storage after the statutory retention window. |

### payroll_journal_entries

**Pattern flags:** has_personal_content=false; has_submit_lock=true; has_single_approver=false

**Justification:** Journal entries lock on submit to the GL; once posted they are immutable and require a reversing entry to change.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Entry staged from pay-run output; debits/credits still adjustable. |
| submitted | 2 | false | false | true | _ | Locked and sent to GL for posting. |
| posted | 3 | false | true | true | _ | Accepted by GL; immutable from this point. |
| reversed | 4 | false | true | true | _ | Counter-entry posted to reverse a prior posted entry. |
| rejected | 5 | false | true | true | _ | GL rejected the submission; author must fix and resubmit as a new entry. |

### tax_authorities

**(static-reference: no lifecycle)**

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

### tax_filings

**Pattern flags:** has_personal_content=false; has_submit_lock=true; has_single_approver=true

**Justification:** Filings lock once filed with the authority; a single tax-ops approver gates submission and any post-filing amendments.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Filing being assembled from pay-run data; numbers still adjustable. |
| submitted | 2 | false | false | true | _ | Locked for internal review; routed to tax-ops approver. |
| approved | 3 | false | false | true | _ | Cleared by tax-ops; ready to transmit to the authority. |
| filed | 4 | false | false | true | _ | Transmitted to the tax authority; awaiting acknowledgement. |
| accepted | 5 | false | true | true | _ | Authority acknowledged successful filing; payment recorded. |
| rejected | 6 | false | true | true | _ | Authority rejected the filing; corrected filing must be issued. |
| amended | 7 | false | true | true | _ | Superseded by an amended filing for the same period. |

## Domain ONBOARDING — Employee Onboarding

### buddy_assignments

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| assigned | 1 | true | false | false | _ | Buddy pairing created and notified; meetings not yet started. |
| active | 2 | false | false | true | _ | Pairing is in flight; cadence meetings underway. |
| completed | 3 | false | true | true | _ | Pairing reached its planned end date; relationship formally closed. |
| cancelled | 4 | false | true | true | _ | Pairing dissolved early (buddy departure, journey abandoned, mismatch). |

### onboarding_cohorts

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| planned | 1 | true | false | false | _ | Cohort defined (start date, target population); journeys not yet bound. |
| active | 2 | false | false | true | _ | Cohort is in flight; new hires moving through shared activities. |
| completed | 3 | false | true | true | _ | All journeys in the cohort have reached terminal state. |
| cancelled | 4 | false | true | true | _ | Cohort abandoned before completion (intake cancelled, restructure). |

### onboarding_document_collections

**Pattern flags:** has_personal_content=true; has_submit_lock=true; has_single_approver=true

**Justification:** New-hire paperwork is per-worker personal content, locks once the worker submits the packet, and requires a single HR/compliance approver to clear it.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| pending | 1 | true | false | false | _ | Required forms identified for the journey; awaiting new-hire input. |
| in_progress | 2 | false | false | false | _ | New hire is filling out and signing forms. |
| submitted | 3 | false | false | true | _ | Packet submitted by the new hire; locked and routed to HR/compliance. |
| approved | 4 | false | false | true | _ | HR/compliance accepted the packet; downstream activations can proceed. |
| rejected | 5 | false | false | true | _ | Approver flagged missing or invalid forms; new hire must remediate. |
| archived | 6 | false | true | true | _ | Stored for retention; no further changes permitted. |

### onboarding_journeys

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| scheduled | 1 | true | false | false | _ | Journey instantiated from a plan; pre-boarding window not yet started. |
| pre_boarding | 2 | false | false | false | _ | Pre-Day-1 activities in flight (welcome content, paperwork, kit shipping). |
| day_one | 3 | false | false | false | _ | New hire has reached Day-1; orientation and Day-1 tasks active. |
| in_progress | 4 | false | false | false | _ | Post-Day-1 stages (week-1, 30/60/90) underway. |
| completed | 5 | false | true | true | _ | All stages and gates met; new hire transitioned to steady-state HCM workflows. |
| cancelled | 6 | false | true | true | _ | Journey aborted (offer rescinded, no-show, early departure). |

### onboarding_plans

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=true

**Justification:** Plan templates require a single program owner to approve before they can be used to instantiate journeys; no draft-lock workflow.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Plan template being authored; not yet selectable for new journeys. |
| approved | 2 | false | false | true | _ | Program owner cleared the plan; ready for production use. |
| active | 3 | false | false | true | _ | Currently selectable when instantiating new journeys. |
| retired | 4 | false | true | true | _ | Superseded by a newer version; existing journeys continue, no new bindings. |

### onboarding_stages

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| pending | 1 | true | false | false | _ | Stage scheduled but its window has not yet opened. |
| active | 2 | false | false | false | _ | Stage is in flight; its tasks are assignable and being worked. |
| completed | 3 | false | true | true | _ | All gate conditions for the stage are satisfied. |
| skipped | 4 | false | true | true | _ | Stage bypassed by plan configuration or manual override for this journey. |

### onboarding_tasks

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| pending | 1 | true | false | false | _ | Task assigned; due date set; not yet started. |
| in_progress | 2 | false | false | false | _ | Assignee has started work or partial evidence captured. |
| completed | 3 | false | true | true | _ | Task done; evidence (form, acknowledgement, signature, ticket id) captured. |
| skipped | 4 | false | true | true | _ | Task waived by manager/HR for this journey. |
| cancelled | 5 | false | true | true | _ | Task voided (journey cancelled, prerequisite removed). |

### welcome_communications

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Communication composed against a template; not yet scheduled. |
| scheduled | 2 | false | false | false | _ | Send time set; queued in the delivery channel. |
| sent | 3 | false | false | true | _ | Dispatched to the channel provider; delivery in flight. |
| delivered | 4 | false | true | true | _ | Channel confirmed delivery to the recipient. |
| failed | 5 | false | true | true | _ | Delivery failed (bounced email, push not registered, opt-out). |
| cancelled | 6 | false | true | true | _ | Scheduled send cancelled before dispatch. |
