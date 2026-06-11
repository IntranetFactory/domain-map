# Subscription Management (SUB-MGMT): questions waiting for you

## What this domain is
Run the full money side of a subscription business: recurring subscriptions, the invoices they generate, metered usage, revenue recognition, and dunning when payments fail.

Today it is two modules, Subscriptions (the subscription lifecycle, usage metering, and revenue recognition) and Billing (invoices and collections), sitting over five core records. It is a heavily regulated area (ASC 606, IFRS 15, SOX, PCI-DSS, GDPR), and several of its sub-areas (usage metering, revenue recognition, subscription analytics) are real point-solution markets in their own right. The questions below decide how far to break it apart and how strict to make a handful of its records.

---

q1: (answer this first) How should Subscription Management be split into modules (the sub-areas of the product)?

- a) Keep two modules: Subscriptions and Billing. Usage metering and revenue recognition stay as capabilities inside Subscriptions.
- b) Split into three to five modules under Subscription Management (for example a separate Usage Metering module and a separate Revenue Recognition module), rebinding the capabilities accordingly.
- c) Spin Usage Metering and Revenue Recognition out as their own separate domains, leaving Subscription Management focused on the subscription lifecycle and billing.

Recommended: a. The two-module shape is the minimal build that ships today; (b) and (c) only pay off once the metering and rev-rec objects justify standalone surfaces. This choice drives the persona shape, the module-level roles and permissions, and the rebinding of capabilities below it, so it unlocks the rest of the build.

a1:

---

q2: Should usage records carry a full posted, rated, billed, reversed lifecycle, or stay an immutable append-only event log?

- a) Add the four-state lifecycle to usage records (treat them as a workflow record). The rating and billing steps then live directly on the usage record.
- b) Keep usage records as an immutable append-only log, and put the rating and billing lifecycle on a separate aggregated charges record (queued as an optional new entity below).

Recommended: b. Modern usage-metering vendors (Metronome, Orb, Lago) keep the raw event immutable and concentrate the lifecycle on an aggregated charges record. Either way the structural check already passes; this is purely the architectural intent.

a2:

---

q3: Should an issued customer invoice be frozen once issued, so re-issuing means voiding it and creating a new draft rather than editing the live one? (yes/no)

Recommended: yes. An issued invoice is a legal document; editing it in place breaks the audit trail. This overwrites a current flag value, so it needs your confirmation.

a3:

---

q4: Should customer invoices be marked as carrying personal data (bill-to address, payment-method last-4, possibly personal email)? (yes/no)

Recommended: yes. That content is personal data and falls under GDPR retention and privacy rules. This overwrites a current flag value, so it needs your confirmation.

a4:

---

q5: Should customer subscriptions be marked as carrying personal data (billing contact, possibly personal address)? (yes/no)

Recommended: yes. The billing contact is personal data. This overwrites a current flag value, so it needs your confirmation.

a5:

---

q6: Should a revenue-recognition record be frozen once recognized, so the post-recognition figure cannot be quietly edited? (yes/no)

Recommended: yes. ASC 606 audit trails require recognized revenue to be immutable. This overwrites a current flag value, so it needs your confirmation.

a6:

---

q7: Should dunning events be marked as carrying personal data (collection notices carry the payer's contact details)? (yes/no)

Recommended: yes. Collection notices carry payer contact details, which are personal data. This overwrites a current flag value, so it needs your confirmation.

a7:

---

q8: How should the "needs formal certification" flag be set on this domain?

- a) Keep it off. SOX and ASC 606 audits are buyer-side, and this flag is reserved for product-level certification like Finanzamt/GoBD or FDA clearance.
- b) Turn it on, reflecting the public-company sales reality that material implementations get auditor-reviewed.
- c) Add a separate "auditor-attestable" column at the catalog level, distinct from "certified" (a broader, multi-domain change).

Recommended: a. The flag means the product itself needs formal certification; a buyer-side SOX audit does not qualify. Pick (c) only if you want to model auditor-attestability across the whole catalog.

a8:

---

q9: Which compliance regulations should be joined onto Subscription Management?

- a) All five: ASC 606, IFRS 15, SOX, PCI-DSS, GDPR.
- b) A subset you specify.
- c) Skip for now, pending formal research.

Recommended: a. Flagship billing and rev-rec vendors universally cite all five. The domain currently has zero regulation joins, so adding the headline set is low-risk and accurate.

a9:

---

q10: Why is the HVAC field-service starter hosted on Subscription Management, and what should happen to that link?

- a) It is intentional: the HVAC starter ships with the subscription billing flow embedded. Keep it.
- b) It is a mis-attribution from load time. Remove the host link.
- c) Refactor it: the starter should consume the Billing module as a dependency rather than embedding the invoice record directly.

Recommended: not pre-set. The starter embeds ten objects but overlaps with Subscription Management only on the invoice record, so this is an editorial intent call only you can make. Note that (b) and (c) are destructive or restructuring changes and would only be applied after you choose them.

a10:

---

q11: The domain's business-logic text contains a forbidden em-dash. May I rewrite it without the em-dash? (yes/no)

Recommended: yes. The proposed wording swaps the em-dash for a colon: "Revenue recognition under ASC 606/IFRS 15, proration, dunning logic, usage rating, and tax determination: regulated and irreducible." You may amend the wording. This overwrites a non-empty value, so it needs your sign-off.

a11:

---

q12: Four cross-domain handoffs carry weak process tags. Should I replace them with better ones (delete the weak tag and insert the corrected tag)?

- a) Yes, replace all four (payment.failed to customer cases re-tagged as customer service; case.churn_risk_detected to dunning re-tagged as collections; customer.churn_confirmed re-tagged as account management; legal_contract.signed re-tagged as customer-account management).
- b) No, leave the existing tags.

Recommended: a. Each existing tag points at the wrong process (a payroll or procurement activity rather than the real customer-billing interaction). This deletes existing rows and inserts replacements, so it needs your sign-off.

a12:

---

q13: Four already-tagged handoffs are waiting on your approval to be promoted from new to approved. Should they be promoted? (yes/no)

Recommended: yes, if you agree the process mappings are correct. Promotion to approved is a sign-off step that I cannot stamp myself.

a13:

---

q17: Contract Lifecycle Management forwards customer subscription to Subscription and Revenue Lifecycle Management to manage customers and accounts, but Subscription and Revenue Lifecycle Management does not yet have anyone assigned to manage customers and accounts, so this step has no owner. How should it be handled?
- a) Record it now as work Subscription and Revenue Lifecycle Management owns, and assign a named owner once Subscription and Revenue Lifecycle Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Subscription and Revenue Lifecycle Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a17:

---

## Optional (will not hold up the build)

q14: Five extra records show up across the flagship billing vendors (a plan catalog, payment methods, aggregated rated-usage charges, tax calculations, and proration credits). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and best done after the module shape in q1 is settled. The rated-usage-charges record in particular only matters if q2 picks the immutable-log option.

a14:

---

q15: Three of this domain's sub-areas (usage metering, revenue recognition, subscription analytics) are recognized standalone markets. Should I research them as candidate spin-out modules or domains (Usage Metering, Revenue Recognition, an Analytics module)? (yes/no)

Recommended: yes in principle, but this is the same call as q1; if q1 keeps two modules, treat these as deferred ideas rather than work.

a15:

---

q16: Four adjacent markets surfaced as candidate new domains (Usage Metering, Sales Tax, Payment Processing, Revenue Recognition). Should I research and queue them for a future build? (yes/no)

Recommended: yes, research-and-queue only. These are non-blocking ideas already noted in the missing-domains backlog.

a16:

---

<!-- agent map, ignore: q1=B2-S5 q2=B2-S1 q3=B2-S2.invoicelock q4=B2-S2.invoicepii q5=B2-S2.subscriptionpii q6=B2-S2.revreclock q7=B2-S2.dunningpii q8=B2-S3 q9=B2-S4 q10=B2-S6 q11=B1A-S9 q12=B1B-H1-RESIDUAL.replace q13=B1B-H1-RESIDUAL.confirm q14=B3-E-SUBSCRIPTION-PLANS+B3-E-PAYMENT-METHODS+B3-E-RATED-USAGE-CHARGES+B3-E-TAX-CALCULATIONS+B3-E-PRORATION-CREDITS q15=B3-M-SPLIT-LIFECYCLE-USAGE+B3-M-SPLIT-LIFECYCLE-REVREC+B3-M-ANALYTICS-MODULE q16=B3-D-USAGE-METERING+B3-D-SALES-TAX+B3-D-PAYMENT-PROCESSING+B3-D-REV-REC q17=B2-B9D-OWN-148 | domain_id=97 -->
