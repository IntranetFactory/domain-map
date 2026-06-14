# Accounts Payable Automation (AP-AUTO): questions waiting for you

## What this domain is
Capture invoices, match them to POs and receipts, and pay suppliers on time without the spreadsheet shuffle.

Run the full accounts-payable cycle in one place: pull invoices in from email and scans with OCR, match each one against its purchase order and goods receipt, route exceptions and approvals to the right people, then batch and execute supplier payments. Catch duplicates and fraud at the front of the workflow, hold every match and payment run to an auditable state machine, and hand clean postings off to the general ledger. This domain is not built out yet, so the questions below shape how it gets assembled.

---

q1: (answer this first) How should Accounts Payable Automation be split into modules (the sub-areas of the product)?

- a) Two modules: Processing (invoice capture plus matching) and Payment Runs (payment execution).
- b) Three modules: Invoice Capture (pull invoices in and read them), Matching (three-way match against PO and receipt), and Payment Runs (batch and pay).
- c) Four modules: the three in (b) plus a Supplier Portal, if the supplier self-service portal belongs inside this domain rather than in Supplier Lifecycle.

Recommended: b. The flagship pure-plays all separate the same three stages: Tipalti, AvidXchange, and Stampli each split invoice capture from three-way matching from payment execution, so three modules (Invoice Capture, Matching, Payment Runs) mirror how the leaders package the market. This choice drives every part of the build below it: which module owns each capability, where the payment-method records live, and how the workflow stages connect.

a1:

---

q2: Should an invoice match lock from further edits once it is released for payment? (yes/no)

Recommended: yes. Once a match is released for payment the record should be frozen for audit, which is standard AP practice.

a2:

---

q3: Should an invoice match require a single named approver? (yes/no)

Recommended: no. Matching is system-decided; the role-gated step is the manual override, not a single sign-off, so this flag stays off.

a3:

---

q4: Should a payment run lock from further edits once it has been executed? (yes/no)

Recommended: yes. An executed payment run should be immutable for audit.

a4:

---

q5: Should a payment run require a single named approver? (yes/no)

Recommended: no. SOX shops typically require dual control on payment approval, so a single-approver lock is the less safe default unless your policy says otherwise.

a5:

---

q6: There is a leftover payment event named "bill_payment.completed" whose name does not match what it actually fires on (a completed payment run), and nothing references it. How should it be handled?

- a) Delete it.
- b) Rename it to "payment_run.completed".
- c) Investigate whether "bill payments" should become a separate tracked record in its own right.

Recommended: a. Nothing references the event and the modern equivalent (payment_run.executed) already exists, so a clean delete is simplest. This is a destructive change, so it needs your sign-off.

a6:

---

q7: The domain's business-logic summary still contains one forbidden em-dash character. Should I replace it with a clean sentence break? The proposed wording is: "OCR/IDP for invoice capture, three-way match against PO and receipt, duplicate detection, and fraud rules. Algorithm-heavy at the front of the workflow." (yes/no)

Recommended: yes. It removes a forbidden character and reads the same. This overwrites an existing value, so it needs your approval.

a7:

---

## Optional (will not hold up the build)

q8: Should I add an invoice-capture job record (one row per OCR/IDP ingestion attempt, carrying OCR confidence and the mailbox or extraction source)? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Every flagship AP vendor models this.

a8:

---

q9: Should I add a per-supplier payment-method record (ACH, wire, check, SEPA, virtual card, cross-border FX)? Its placement depends on the module-split answer above. (yes/no)

Recommended: yes, but additive and can happen after the modules exist.

a9:

---

q10: Should I add a per-invoice payment-run line record with line-level status (queued, executed, failed, returned, voided)? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. It is what lets a payment exception attach to one line rather than the whole run.

a10:

---

q11: Should I run formal vendor research on the remaining speculative candidates (early-payment-discount offers, dynamic-discounting terms, fraud flags, KYC vendor checks, tax-withholding records, virtual-card authorizations) before adding any of them? (yes/no)

Recommended: yes. These overlap other domains, so a vetting pass is worth it before they land.

a11:

---

<!-- agent map, ignore: q1=B2-MOD-SHAPE q2=B2-PATTERN-FLAGS.invoice_matches.has_submit_lock q3=B2-PATTERN-FLAGS.invoice_matches.has_single_approver q4=B2-PATTERN-FLAGS.payment_runs.has_submit_lock q5=B2-PATTERN-FLAGS.payment_runs.has_single_approver q6=B2-EVENT-12 q7=B1A-S14 q8=B3-INVOICE-CAPTURE-JOBS q9=B3-PAYMENT-METHODS q10=B3-PAYMENT-RUN-LINES q11=B3-UNNAMED-POOL | domain_id=29 -->
