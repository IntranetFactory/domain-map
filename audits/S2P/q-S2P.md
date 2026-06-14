# Source-to-Pay (S2P): questions waiting for you

## What this domain is
Run procurement end to end: source suppliers, raise requisitions, issue POs, receive goods, and match invoices in one workflow.

S2P (Source-to-Pay) is the operational backbone of corporate buying. From the first RFx through final invoice payment, S2P tracks the requisition, the purchase order, the goods receipt, and the supplier invoice as a single chain of business records, with controls (approvals, three-way match, savings tracking) layered on top. Buyers run requisitions through approval workflows, sourcing managers run RFx events and award contracts, receivers post goods receipts against open POs, and AP specialists match invoices to POs and receipts before releasing payment. Spend categories drive routing (direct, indirect, services, tail), and savings against negotiated contract prices are tracked at line-item granularity.

---

q1: (answer this first) How should Source-to-Pay be split into modules (the sub-areas of the product)?

- a) Five modules: Sourcing (RFx, auctions, award); Requisition-to-PO (requisitions, approvals, PO creation and change orders); Receiving (goods receipts, three-way-match readiness); Invoice Matching (supplier invoice ingestion, matching, exception routing); Catalog Management (punch-out and hosted catalogs, item-master integration).
- b) Same five as (a), but with the AP-AUTO boundary resolved so S2P stops at goods receipt and AP-AUTO absorbs invoice matching (drop the Invoice Matching module).
- c) Same five as (a), but with the AP-AUTO boundary resolved so S2P owns invoice matching and hands off to AP-AUTO at invoice.approved (keep the Invoice Matching module).
- d) A leaner three-module or four-module shape (for example collapse Receiving into Invoice Matching, or collapse Sourcing into Requisition-to-PO).
- e) Defer the module decision and keep S2P pre-modular for now.

Recommended: a. The five-module split mirrors the flagship S2P suites (SAP Ariba, Coupa, Ivalua) and matches the existing master, lifecycle, and capability footprint. This choice gates nearly every structural fix and the market-specific capability authoring below it, so it unlocks the rest of the build. The domain is currently unbuilt (zero modules), so this is the build decision.

a1:

---

q2: The duplicate JAGGAER ONE vendor rows (one older mixed-case, one newer all-caps) need to collapse to a single row. Which survives, and the other is deleted?

- a) Keep the older mixed-case "Jaggaer ONE" row; delete the all-caps row.
- b) Keep the all-caps "JAGGAER ONE" row; delete the mixed-case row.
- c) Merge under a different hand-picked form (specify), and delete the loser.

Recommended: b. The all-caps "JAGGAER ONE" matches the vendor's current marketing form. This deletes a row and re-points its market-coverage link, so it needs your sign-off before it runs.

a2:

---

q3: Should issued purchase orders and published sourcing events be locked from edits once they reach those states (so a buyer cannot quietly change an issued PO without a change order)?

- a) Lock both purchase orders (once issued) and sourcing events (once published).
- b) Lock purchase orders only.
- c) Lock sourcing events only.
- d) Lock neither (leave both editable).

Recommended: a. An issued PO and a published sourcing event are both commitments that should not be edited in place. This overwrites an already-set flag on each master, so it is surfaced for your confirmation rather than applied automatically.

a3:

---

q4: For the supplier-facing email tooling, should email stay as a workflow-specific channel where it is the contract artifact, or should every module move to the generic notify-person abstraction?

- a) Keep email on Requisition-to-PO (PO dispatch is the supplier-facing contract) and on Invoice Matching (receipt confirmations); use notify-person everywhere else.
- b) Keep email on Requisition-to-PO only; use notify-person on all other modules.
- c) Use notify-person across all S2P modules; no channel-specific email links.

Recommended: a. In many B2B flows the PO dispatch email is the order to the supplier, so email is workflow-specific there; other notifications should use the abstraction so the channel can change without rewiring. This binds only after the modules from q1 exist.

a4:

---

q5: Should a supplier invoice be treated as carrying regulated personal data (the supplier's tax id and legal address) in jurisdictions with mandatory e-invoicing (Italy SdI, France Chorus, Mexico CFDI)?

- a) Yes, the personal-content flag covers tax-personal data; mark supplier invoices accordingly.
- b) No, the flag covers only employee-personal data; leave supplier invoices unflagged.
- c) Introduce a separate flag for tax-personal data (out of scope for this audit).

Recommended: b. For most B2B invoices the current unflagged state is correct, and the personal-content flag is intended for employee-personal data; confirm this reading before it is treated as settled.

a5:

---

q6: After the module-split fix lands, when should the pairwise reconciliation against the four closest neighbors (Supplier Lifecycle, AP Automation, CLM, SaaS Management) run?

- a) Inline as the next audit step, right after the module-split fix lands.
- b) As four separate validation runs, one neighbor at a time (Supplier Lifecycle first, then AP Automation, CLM, SaaS Management).
- c) Defer pairwise until all four neighbors have themselves been audited.

Recommended: a. Running it inline after the modules exist resolves the blocked cross-domain attribution in one pass. This is a scheduling choice and does not block the build.

a6:

---

q7: All 29 of S2P's cross-domain handoffs are tagged with a process, but none are approved yet (the headline quality number is the approved count). How should the agent-curated process tags be handled?

- a) Sweep-approve the 17 agent-curated rows loaded on 2026-05-31.
- b) Sweep-approve all 23 agent-curated rows (including pre-existing ones).
- c) Leave them at new for the normal reviewer flow.
- d) Name specific rows to approve.

Recommended: a. The 2026-05-31 agent-curated batch is the clean set to promote. Flipping rows to approved is a sign-off step, so it is never applied without your call.

a7:

---

q8: One S2P handoff (purchase-order/invoice data flowing to Agency Management) was tagged with a broad "Process accounts payable" process when a more specific "Audit invoices and key data in AP system" process already fits the same data better. Re-point it to the more specific tag?

- a) Re-point the tag to the more specific "Audit invoices and key data in AP system".
- b) Leave the broad tag as-is.

Recommended: a. The more specific process is a better description of what actually happens on this handoff, and the specific process already exists. This overwrites an existing tag, so it needs your sign-off before it runs.

a8:

---

q9: One S2P handoff (contract data flowing to Contract Lifecycle Management) was tagged with a "Provide sourcing governance" process, but the contract itself is already covered by a "Negotiate and document agreements/contracts" process; the current tag is in the wrong category for what flows across this handoff. How should it be fixed?

- a) Re-point the tag to "Negotiate and document agreements/contracts".
- b) Delete the wrong tag from this handoff.
- c) Leave the tag as-is.

Recommended: a. The contract data is already realized under the agreements/contracts process, so re-pointing keeps the handoff correctly described. This overwrites (or removes) an existing tag, so it needs your sign-off.

a9:

---

## Optional (will not hold up the build)

q10: Should I research and add procurement catalog masters (catalogs and catalog items, likely decomposing into roughly 5 to 8 entities such as catalog versions, item attributes, supplier-content versus buyer-content, punch-out sessions, and item-master sync) for a Catalog Management module? (yes/no)

Recommended: yes, but additive and only meaningful if the Catalog Management module in q1 is approved; it can happen after the modules exist.

a10:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-JAGGAER q3=B2-PATTERN-FLAGS q4=B2-SEND-EMAIL q5=B2-EINVOICE-PII q6=B2-PAIRWISE-TIMING q7=B2-H1-APPROVAL q8=B2-B9D-RETAG-347 q9=B2-B9D-MISTAG-40 q10=B3-CATALOGS | domain_id=27 -->
