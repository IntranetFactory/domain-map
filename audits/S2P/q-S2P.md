# Source-to-Pay (S2P): questions waiting for you

## What this domain is
Run procurement end to end: source suppliers, raise requisitions, issue purchase orders, receive goods, and match invoices in one connected workflow.

Source-to-Pay is the operational backbone of corporate buying. It tracks the requisition, the purchase order, the goods receipt, and the supplier invoice as one connected chain of records, with approvals, three-way matching, and savings tracking layered on top. Buyers raise requisitions and route them through approval, sourcing managers run RFx events and award contracts, receivers post goods receipts against open orders, and accounts-payable specialists match invoices to orders and receipts before payment is released.

The value is control and speed across the whole buying motion: every dollar of spend is requested, approved, and reconciled against a negotiated price, exceptions are routed instead of stalling the line, and spend categories drive the routing so direct, indirect, services, and tail spend each follow the right path.

---

q1: (answer this first) How should Source-to-Pay be split into modules (the sub-areas of the product)?

- a) Four modules: Sourcing (RFx, auctions, bids, awards, savings); Requisition-to-PO (requisitions, intake, approvals, PO creation and change orders, goods receipts); Invoice Capture (supplier invoice ingestion plus the e-invoicing compliance cluster); Catalog Management (punch-out and hosted catalogs, item-master integration).
- b) Five modules: the four in (a), but pull goods receipts out into a standalone Receiving module.
- c) Three modules (lean launch): Sourcing; Requisition-to-PO (also absorbs receiving and catalog); Invoice Capture.
- d) Any of the above, plus an optional Spend Analytics module that masters the spend-category taxonomy.
- e) Defer the module decision and keep S2P pre-modular for now.

Recommended: a. Across the flagship suites the four seams are the ones vendors actually package and sell. Coupa, SAP Ariba, Ivalua, GEP SMART, and JAGGAER all ship a discrete Sourcing module (Ariba sells it as a separate Strategic Sourcing Suite SKU), and RFP/RFQ/RFI live in Sourcing, never in Procurement, across the whole set. Requisitions plus purchase orders are the transactional spine everywhere; intake (Coupa Intake and Orchestration, Ariba Intake Management, Zip's flagship intake) folds in as a front door to requisitioning rather than a separate module. No vendor sells "receiving" as a separate purchasable module, so goods receipts most defensibly fold into Requisition-to-PO (option b only if you want receiving as its own capability). Invoice Capture is vendor-supported as the invoice system of record (Ariba Buying and Invoicing, Coupa Invoicing, Basware's entire business). Catalog is a soft seam: only Ariba sells it as a separate SKU while Coupa, Ivalua, GEP, and JAGGAER fold it into procurement, but its distinct objects justify keeping it separate. This is the build decision for an unbuilt domain and gates the rest of the structural work below it.

a1:

---

q2: For the supplier-invoice and payment chain, should S2P master the invoice record and consume matching and payment from the separate AP Automation domain, or own matching itself?

- a) S2P masters the supplier-invoice record (capture, ingestion, e-invoicing compliance) and consumes invoice matching and payment runs from AP Automation, handing off when an invoice is captured or approved.
- b) S2P stops at goods receipt and AP Automation also takes over the supplier-invoice record (S2P just consumes invoices).
- c) S2P owns invoice matching too, re-mastering the match object away from AP Automation (a destructive re-master).

Recommended: a. The live catalog already draws this line and it matches vendor reality. S2P is the only domain that masters the supplier-invoice record today, while the match-result object and the payment-run object are mastered by AP Automation, and the existing handoffs (AP Automation raising match exceptions back to S2P, S2P feeding PO and receipt events forward) confirm matching and pay sit downstream. SAP Ariba draws exactly this cut, folding invoicing into Buying and Invoicing but stopping at a payment request handed to the ERP rather than disbursing; Coupa, Ivalua, and Basware own capture through pay natively, but the catalog has chosen the Ariba-like split so the invoice record stays with the buying spine and AP Automation does the matching and the payment run.

a2:

---

q3: Confirm that S2P consumes suppliers from the Supplier Management domain and contracts from Contract Lifecycle Management, rather than mastering its own copy of either? (yes/no)

- a) Yes: S2P consumes suppliers (mastered by Supplier Management) and contracts (mastered by Contract Lifecycle Management), with no S2P-side supplier or contract master.
- b) No: S2P should master its own procurement-side supplier or contract record (specify which, and why).

Recommended: a. In the live catalog the supplier record is mastered by Supplier Management and the contract document by Contract Lifecycle Management, and every flagship suite (Coupa, SAP Ariba, Ivalua, GEP SMART, JAGGAER) ships a distinct Supplier Management module and a distinct Contract Management module separate from sourcing and buying. So the supplier and contract records are their own systems of record that procurement consumes; S2P's existing footprint already records suppliers as a consumer and contracts as a contributor, and no S2P-side master is warranted.

a3:

---

q4: Services procurement (statements of work, services engagements, milestones) is being analyzed as its own domain in parallel. Should S2P treat services as a spend category and hand off to that domain rather than mastering any services-procurement entity? (yes/no)

- a) Yes: S2P relates to and hands off to the services-procurement (SOW) domain; services is a spend-routing category and S2P masters no SOW entity.
- b) No: S2P should master services-procurement entities (statements of work, milestones) itself.
- c) Defer until the parallel SOW domain analysis lands, then wire the handoff.

Recommended: a. No statement-of-work master exists in the catalog today, and services procurement is a distinct market segment that vendors sell separately from the goods-buying spine: SAP Fieldglass, Beeline, Coupa Contingent Workforce, and Ivalua's services-procurement offering all model statements of work and services engagements as their own systems of record. S2P already routes services as one of its spend categories (direct, indirect, services, tail), so treating it as a routing path that hands off to the dedicated SOW domain matches the vendor surface.

a4:

---

q5: Is the buyer-facing catalog copy below (the domain tagline and description shown to buyers) correct as written, or do you want to edit it? (yes/no)

Tagline (as written): "Run procurement end to end: source suppliers, raise requisitions, issue purchase orders, receive goods, and match invoices in one connected workflow."

Description (as written): "Source-to-Pay is the operational backbone of corporate buying. It tracks the requisition, the purchase order, the goods receipt, and the supplier invoice as one connected chain of records, with approvals, three-way matching, and savings tracking layered on top. Buyers raise requisitions and route them through approval, sourcing managers run RFx events and award contracts, receivers post goods receipts against open orders, and accounts-payable specialists match invoices to orders and receipts before payment is released. The value is control and speed across the whole buying motion: every dollar of spend is requested, approved, and reconciled against a negotiated price, exceptions are routed instead of stalling the line, and spend categories drive the routing so direct, indirect, services, and tail spend each follow the right path."

- a) Yes, the copy is correct, keep it as written.
- b) No, I want to edit it (supply the replacement wording).

Recommended: a. The copy is already written in buyer voice and names no vendors or products. Confirming it keeps the text as-is; any edit you supply is the approved overwrite.

a5:

---

q6: The duplicate JAGGAER ONE vendor rows (one older mixed-case, one newer all-caps) need to collapse to a single row. Which survives, and the other is deleted?

- a) Keep the older mixed-case "Jaggaer ONE" row; delete the all-caps row.
- b) Keep the all-caps "JAGGAER ONE" row; delete the mixed-case row.
- c) Merge under a different hand-picked form (specify), and delete the loser.

Recommended: b. The all-caps "JAGGAER ONE" matches the vendor's current marketing form. This deletes a row and re-points its market-coverage link, so it needs your sign-off before it runs.

a6:

---

q7: Should issued purchase orders and published sourcing events be locked from edits once they reach those states (so a buyer cannot quietly change an issued PO without a change order)?

- a) Lock both purchase orders (once issued) and sourcing events (once published).
- b) Lock purchase orders only.
- c) Lock sourcing events only.
- d) Lock neither (leave both editable).

Recommended: a. An issued PO and a published sourcing event are both commitments that should not be edited in place. This overwrites an already-set flag on each master, so it is surfaced for your confirmation rather than applied automatically.

a7:

---

q8: For the supplier-facing email tooling, should email stay as a workflow-specific channel where it is the order artifact, or should every module move to the generic notify-person abstraction?

- a) Keep email on Requisition-to-PO (PO dispatch is the supplier-facing order) and on Invoice Capture (receipt confirmations); use notify-person everywhere else.
- b) Keep email on Requisition-to-PO only; use notify-person on all other modules.
- c) Use notify-person across all S2P modules; no channel-specific email links.

Recommended: a. In many B2B flows the PO dispatch email is the order to the supplier, so email is workflow-specific there; other notifications should use the abstraction so the channel can change without rewiring. This binds only after the modules from q1 exist.

a8:

---

q9: Should a supplier invoice be treated as carrying regulated personal data (the supplier's tax id and legal address) in jurisdictions with mandatory e-invoicing (Italy SdI, France Chorus Pro, Mexico CFDI)?

- a) Yes, the personal-content flag covers tax-personal data; mark supplier invoices accordingly.
- b) No, the flag covers only employee-personal data; leave supplier invoices unflagged.
- c) Introduce a separate flag for tax-personal data (out of scope for this audit).

Recommended: b. For most B2B invoices the current unflagged state is correct, and the personal-content flag is intended for employee-personal data; confirm this reading before it is treated as settled.

a9:

---

q10: After the module-split fix lands, when should the pairwise reconciliation against the four closest neighbors (Supplier Management, AP Automation, Contract Lifecycle Management, SaaS Management) run?

- a) Inline as the next audit step, right after the module-split fix lands.
- b) As four separate validation runs, one neighbor at a time.
- c) Defer pairwise until all four neighbors have themselves been audited.

Recommended: a. Running it inline after the modules exist resolves the blocked cross-domain attribution in one pass. This is a scheduling choice and does not block the build.

a10:

---

q11: All 29 of S2P's cross-domain handoffs are tagged with a process, but none are approved yet (the headline quality number is the approved count). How should the agent-curated process tags be handled?

- a) Sweep-approve the 17 agent-curated rows loaded on 2026-05-31.
- b) Sweep-approve all 23 agent-curated rows (including pre-existing ones).
- c) Leave them at new for the normal reviewer flow.
- d) Name specific rows to approve.

Recommended: a. The 2026-05-31 agent-curated batch is the clean set to promote. Flipping rows to approved is a sign-off step, so it is never applied without your call.

a11:

---

q12: One S2P handoff (purchase-order/invoice data flowing to Agency Management) was tagged with a broad "Process accounts payable" process when a more specific "Audit invoices and key data in AP system" process already fits the same data better. Re-point it to the more specific tag?

- a) Re-point the tag to the more specific "Audit invoices and key data in AP system".
- b) Leave the broad tag as-is.

Recommended: a. The more specific process is a better description of what actually happens on this handoff, and the specific process already exists. This overwrites an existing tag, so it needs your sign-off before it runs.

a12:

---

q13: One S2P handoff (contract data flowing to Contract Lifecycle Management) was tagged with a "Provide sourcing governance" process, but the contract itself is already covered by a "Negotiate and document agreements/contracts" process; the current tag is in the wrong category for what flows across this handoff. How should it be fixed?

- a) Re-point the tag to "Negotiate and document agreements/contracts".
- b) Delete the wrong tag from this handoff.
- c) Leave the tag as-is.

Recommended: a. The contract data is already realized under the agreements/contracts process, so re-pointing keeps the handoff correctly described. This overwrites (or removes) an existing tag, so it needs your sign-off.

a13:

---

## Optional (will not hold up the build)

q14: Should I research and add procurement catalog masters (catalogs and catalog items, likely decomposing into roughly 5 to 8 entities such as catalog versions, item attributes, supplier-content versus buyer-content, punch-out sessions, and item-master sync) for the Catalog Management module? (yes/no)

Recommended: yes, but additive and only meaningful if the Catalog Management module in q1 is approved; it can happen after the modules exist.

a14:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-AP-BOUNDARY q3=B2-CONSUME-CONFIRM q4=B2-SOW-RELATION q5=B2-CATALOG-COPY q6=B2-JAGGAER q7=B2-PATTERN-FLAGS q8=B2-SEND-EMAIL q9=B2-EINVOICE-PII q10=B2-PAIRWISE-TIMING q11=B2-H1-APPROVAL q12=B2-B9D-RETAG-347 q13=B2-B9D-MISTAG-40 q14=B3-CATALOGS | domain_id=27 -->
