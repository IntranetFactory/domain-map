# Phase B3 cluster draft — G_procurement_signing

Domains covered: S2P, ESIGN.

## Domain S2P — Source-to-Pay

### goods_receipts

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| pending | 1 | true | false | false | _ | Receipt expected against an issued PO but not yet recorded. |
| received | 2 | false | false | false | _ | Goods or services logged as physically received by the requester or warehouse. |
| discrepancy | 3 | false | false | false | _ | Quantity, condition, or specification mismatch flagged against the PO. |
| confirmed | 4 | false | true | false | _ | Receipt reconciled and released for 3-way matching against PO and invoice. |

### purchase_orders

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | PO being prepared from an approved requisition; not yet sent to the supplier. |
| issued | 2 | false | false | true | issue_po | PO formally dispatched to the supplier, authorizing delivery. |
| acknowledged | 3 | false | false | false | _ | Supplier confirmed receipt and acceptance of the PO terms. |
| partially_received | 4 | false | false | false | _ | Some but not all PO lines have confirmed goods receipts. |
| received | 5 | false | false | false | _ | All PO lines have confirmed goods receipts. |
| closed | 6 | false | true | false | _ | PO fully matched, invoiced, and paid; no further activity expected. |
| cancelled | 7 | false | true | false | _ | PO terminated before fulfillment; no further deliveries or invoices accepted. |

### purchase_requisitions

**Pattern flags:** has_personal_content=false; has_submit_lock=true; has_single_approver=true

**Justification:** Requesters draft and submit a requisition that locks on submit, and an explicit single budget approver gates the approved transition.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Requester is preparing the requisition; editable and not yet routed for approval. |
| submitted | 2 | false | false | false | _ | Requisition submitted for approval; locked from further requester edits. |
| approved | 3 | false | false | true | approve_requisition | Budget approver signed off on the requisition; ready for PO creation. |
| po_created | 4 | false | false | false | _ | Procurement converted the approved requisition into one or more purchase orders. |
| closed | 5 | false | true | false | _ | Requisition fully fulfilled by downstream POs and receipts. |
| rejected | 6 | false | true | false | _ | Approver declined the requisition; requester may revise into a new requisition. |
| cancelled | 7 | false | true | false | _ | Requester or procurement cancelled the requisition before approval or fulfillment. |

### sourcing_events

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false

**Justification:** no behavioral pattern applies

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Sourcing event being scoped: requirements, supplier list, scorecard weighting. |
| published | 2 | false | false | false | _ | Event released to invited suppliers; responses can now be collected. |
| in_progress | 3 | false | false | false | _ | Suppliers are actively submitting responses or bids. |
| bidding_closed | 4 | false | false | false | _ | Response window has closed; sourcing team is evaluating submissions. |
| awarded | 5 | false | true | true | award_event | Winning supplier selected; outcome feeds CLM contract creation. |
| cancelled | 6 | false | true | false | _ | Event terminated without award. |

### supplier_invoices

**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=true

**Justification:** AP routes invoices to an explicit single approver before payment, gating the approved transition.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| received | 1 | true | false | false | _ | Invoice captured from the supplier (email, EDI, portal) and logged in AP. |
| matching | 2 | false | false | false | _ | 3-way match in progress against PO and goods receipts. |
| approved | 3 | false | false | true | approve_invoice | AP approver signed off on the matched invoice; queued for payment. |
| paid | 4 | false | true | false | _ | Payment issued to the supplier and reconciled. |
| disputed | 5 | false | false | false | _ | Invoice contested due to matching, pricing, or delivery issues; resolution pending. |
| written_off | 6 | false | true | false | _ | Outstanding balance closed without payment after dispute or aging policy. |

## Domain ESIGN — Electronic Signature

### envelopes

**Pattern flags:** has_personal_content=false; has_submit_lock=true; has_single_approver=false

**Justification:** Envelopes are drafted with recipients and documents, and sending locks the envelope contents from further edits.

**Lifecycle states:**

| state_name | order | initial | terminal | requires_perm | verb_override | description |
|---|---|---|---|---|---|---|
| draft | 1 | true | false | false | _ | Envelope being assembled with documents, recipients, and signature fields. |
| sent | 2 | false | false | true | send_envelope | Envelope dispatched to recipients; contents locked from further edits. |
| delivered | 3 | false | false | false | _ | First recipient has opened the envelope; signing has not yet begun. |
| partially_signed | 4 | false | false | false | _ | One or more, but not all, required signers have completed signing. |
| completed | 5 | false | true | false | _ | All required signers have signed; envelope is the authoritative signed artifact. |
| declined | 6 | false | true | false | _ | A signer declined to sign; envelope cannot complete. |
| voided | 7 | false | true | false | _ | Sender voided the envelope before completion. |
| expired | 8 | false | true | false | _ | Envelope passed its signing deadline without completion. |
