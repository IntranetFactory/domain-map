# Vendor Management System (VMS): questions waiting for you

## What this domain is
Source contingent workers through approved staffing suppliers, manage rate cards, and reconcile timesheets and invoices end-to-end.

Manage the full contingent-workforce cycle, requisitions, supplier distribution, candidate submissions, worker assignments, timesheets, and invoices, in one system. Approve rate cards by role and region; classify each worker against IR35, California AB5, and EU Platform Work rules; and feed approved timesheets to payroll and project accounting automatically. Procurement and HR run it jointly: procurement governs the supplier panel, HR governs the worker classification.

---

q1: (answer this first) One entity (id 187) is named "Preventive Maintenance Work Order" but its description and every workflow attached to it behave like a staffing requisition or statement of work. Which is it really?

- a) It is a staffing requisition / SOW: rename, relabel, and re-alias it, and keep it where it is. Most consistent with the existing relationships and handoffs.
- b) It is genuinely Preventive Maintenance: delete the contingent-labor master row and the relationships tying it to staffing data, route the entity to Enterprise Asset Management, and create a fresh staffing-requisitions master here instead.
- c) Split the difference: keep the entity as Preventive Maintenance (route to Enterprise Asset Management) and create a new staffing-requisitions master here.

Recommended: a. The description, attached workflows, trigger event, and handoff routing all point at a staffing requisition or SOW, so renaming is the cleanest fix. This choice gates the module shape and several other items below, so it unlocks the rest of the build. Note: options (b) and (c) involve deletions and entity removal, so picking either is a destructive change that needs your explicit sign-off.

a1:

---

q2: How should Vendor Management System be split into modules (the sub-areas of the product)?

- a) Keep the two modules already built: Worker Sourcing (requisitions, suppliers, rate cards, workers) and Time and Invoicing (timesheets, invoices).
- b) Re-split into three modules: Requisitions, Suppliers and Rates, and Time and Invoicing. This requires a follow-up migration of capabilities and master records.
- c) Keep the two-module split but rename the module codes (note: the codes are load-bearing in URLs, permission prefixes, and handoff backfills).

Recommended: a. The default two-way split is already live and now has handoffs, roles, and system skills attached to it; changing it now is a migration, not a fresh build.

a2:

---

q3: Should contingent workers be flagged as holding personal data, so privacy and retention rules apply? (yes/no)

Recommended: yes. These records carry PII such as Social Security number, tax classification, and IR35 status.

a3:

---

q4: Should staffing suppliers require a single named approver to activate? (yes/no)

Recommended: yes. Procurement approves supplier activation, so a single accountable approver is the natural fit.

a4:

---

q5: Should rate cards require a single named approver to publish? (yes/no)

Recommended: yes. Procurement or finance signs off on rate cards before they go live.

a5:

---

q6: Should the staffing requisition / work-order entity (id 187) require a single named approver? (yes/no)

Recommended: yes, the hiring manager approves it. This depends on resolving q1 first (it only applies if 187 is a staffing requisition).

a6:

---

q7: Should contingent invoices require a single named approver before payment? (yes/no)

Recommended: yes. The accounts-payable team approves payment.

a7:

---

q8: Can I use the drafted tagline and description for the domain as written? (Tagline: "Source contingent workers through approved staffing suppliers, manage rate cards, and reconcile timesheets and invoices end-to-end." Description: the three-sentence buyer-voice summary above.) (yes/no)

Recommended: yes. The drafts are in buyer voice and ready to load; the only reason this is a question is that domain catalog text needs your explicit wording approval before it is written.

a8:

---

q9: Can I use the drafted business-logic note for the domain as written? (Draft: "Rate-card refresh recomputes accrued cost across all active timesheets when a rate row supersedes; worker-classification engine applies IR35 / California AB5 / EU PWD precedence rules per engagement, producing a typed classification record that downstream payroll and AP-AUTO rely on for withholding rules.") (yes/no)

Recommended: yes. It accurately names the non-standard logic the domain runs; rewrite it if you want different wording.

a9:

---

q11: Core Financial Management hands work to Vendor Management System, but Vendor Management System has no one assigned to process accounts payable (AP), so that step currently has nobody responsible for it. Who should own it?
- a) The a named owner runs it and approves it.
- b) Someone else you name runs and approves it.
- c) Leave it unassigned for now.

Recommended: a. Vendor Management System already assigns the a named owner to work of this kind, so (a) fills this gap the same way and gives the work a named owner.

a11:

---

## Optional (will not hold up the build)

q10: Three extra master records show up across the flagship VMS vendors (Workday VNDLY, SAP Fieldglass, Beeline, Magnit, Utmost): candidate submissions (suppliers slate candidates against a requisition), worker assignments (a worker anchored to a winning requisition with start, end, and billable rate), and worker classifications (the typed IR35 / AB5 / EU Platform Work determination per worker per engagement). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. All three are common across the vendor set, and worker classifications is implied by the compliance regulations already loaded.

a10:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-4 q3=B2-3.workerpii q4=B2-3.supplierapprover q5=B2-3.rateapprover q6=B2-3.187approver q7=B2-3.invoiceapprover q8=B2-2 q9=B2-5 q10=B3-CANDIDATE-SUBMISSIONS+B3-WORKER-ASSIGNMENTS+B3-WORKER-CLASSIFICATIONS q11=B2-B9D-OWN-315 | domain_id=64 -->
