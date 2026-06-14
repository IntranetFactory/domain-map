# Configure, Price, Quote (CPQ): questions waiting for you

## What this domain is
Turn product selection into an accurate, approved, sellable quote. Sellers configure the right product mix, the system applies your pricing and discount rules, deals route through approval when they cross a threshold, and an accepted quote becomes a contract draft ready to hand off to legal and billing. It covers the full quote-to-contract path: product catalog and bundles, the quote builder, discounts and approvals, and the contract draft.

---

q1: (answer this first) Should I author the single domain-grain CPQ system skill now (deriving its toolset) and populate the module tool requirements for the three modules, or hold until the modularization backlog batch picks it up?

- a) Author the domain-grain CPQ system skill and the module tool rows now.
- b) Hold until the modularization backlog batch picks it up.

Recommended: a. Under the per-domain-skill model this is now a single skill plus a small set of module-tool rows, not the old large per-module load, so there is little reason to defer. This is the build-shape decision the rest of the work hangs off.

a1:

---

q2: When a discount is approved, should CPQ publish a second, post-approval handoff to CLM authoring, or is the existing "contract draft generated" event already the post-approval signal?

- a) Add a second handoff on "discount approval granted" to CLM authoring.
- b) Confirm "contract draft generated" already means post-approval; add no second handoff.
- c) Rename "contract draft generated" to make the post-gate meaning explicit, and treat it as the post-approval event.

Recommended: b, if the draft is only ever generated after approval lands. The right answer depends on whether that event fires before or after the approval gate, which only you can confirm.

a2:

---

q3: Should CPQ publish stage-progression telemetry to CRM pipeline management when a quote is sent and/or when a quote is rejected?

- a) Add both handoffs (quote sent and quote rejected).
- b) Add only the quote-rejected handoff (more decision-relevant for pipeline scoring).
- c) Skip both; let CRM observe outcomes via opportunity stage updates instead.

Recommended: depends on your shop. Some keep all telemetry inside CPQ; others mirror it to CRM for pipeline scoring. If you mirror, (b) is the leanest useful choice.

a3:

---

q4: Should quote discounts be locked once submitted, so a submitted discount cannot be edited in place? (yes/no)

Recommended: yes. The discount workflow already has a lock-once-submitted shape (pending approval), so the flag should match it. This overwrites an existing value, so it needs your confirmation.

a4:

---

q5: Should contract drafts be locked once signed, so a signed draft cannot be edited before execution? (yes/no)

Recommended: yes. The draft moves signed then executed, and a signed draft should not change underneath that step. This overwrites an existing value, so it needs your confirmation.

a5:

---

q6: Should sales quotes be flagged as carrying personal data, given they hold buyer contact details, billing addresses, and sometimes signatory names? (yes/no)

Recommended: yes. Quotes routinely carry buyer personal data, which drives downstream encryption and privacy handling. This overwrites an existing value, so it needs your confirmation.

a6:

---

q7: Pricing rules and product bundles are now classified as configuration (catalog) shape, which means they are audit-clean with no lifecycle states. Confirm they stay state-machine-free, or author an optional publishing lifecycle (draft, published, deprecated)?

- a) Confirm both stay state-machine-free (no states).
- b) Author a draft, published, deprecated lifecycle for both.
- c) Mixed: author a lifecycle for one, leave the other stateless (specify which).

Recommended: a. As configuration assets they already satisfy the audit; adding a publishing lifecycle is a discretionary improvement, not a gap.

a7:

---

q8: The HVAC service-management starter is currently cross-hosted on CPQ, but only one of its eleven embedded objects (sales quotes) actually touches CPQ. Keep, remove, or relocate the cross-host?

- a) Keep the cross-host on CPQ.
- b) Remove it and rely on the starter's eventual primary host (field service or agency management).
- c) Add a second cross-host on the more appropriate domain (field service) instead.

Recommended: b or c. HVAC service management is primarily a field-service domain, and the single CPQ touchpoint is thin; hosting it on CPQ inflates the CPQ footprint for little payoff.

a8:

---

q9: A process tag on the "quote expired to CRM" handoff was auto-derived by substring match. The process target is correct; only its provenance should flip to agent-curated. Approve the flip? (yes/no)

Recommended: yes. The process mapping is right and only the provenance label is wrong. This overwrites a value on an existing row, so it needs your sign-off.

a9:

---

q10: The "contract template published from CLM to CPQ" handoff is tagged to a weak-looking customer-support process. Which process should it carry?

- a) Retarget to "Develop and manage sales proposals, bids, and quotes".
- b) Retarget to a sales-strategy process (specify which).
- c) Keep the current tag.

Recommended: a. This is a sales-cycle event, so the proposals-and-quotes process fits far better than the current customer-support tag.

a10:

---

q11: The "account tier changed from CRM to CPQ" handoff is tagged to an accounting process, which is the wrong domain. Which process should it carry?

- a) Retarget to "Manage sales partners and alliances".
- b) Retarget to "Manage sales orders".
- c) Other (specify which).
- d) Keep the current tag.

Recommended: a or b. The current accounting tag is clearly wrong-domain; both proposed sales processes are defensible, so pick the one that matches how you treat tier-driven price updates.

a11:

---

q12: The "PIM product published to CPQ" handoff sits on a fallback process because the better candidates could not be uniquely resolved. Confirm the fallback, or retarget?

- a) Keep the current fallback process.
- b) Retarget to "Manage product master data" (resolve the exact process).
- c) Retarget to a marketing-assets process (specify which).

Recommended: b. A published product feed maps most naturally to product master data; the fallback was only a placeholder.

a12:

---

q14: Contract Lifecycle Management forwards cpq contract draft to Configure-Price-Quote to develop and manage sales proposals, bids, and quotes, but Configure-Price-Quote does not yet have anyone assigned to develop and manage sales proposals, bids, and quotes, so this step has no owner. How should it be handled?
- a) Record it now as work Configure-Price-Quote owns, and assign a named owner once Configure-Price-Quote sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Configure-Price-Quote decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: Product Information Management forwards product configuration to Configure-Price-Quote to manage product and service master data, but Configure-Price-Quote does not yet have anyone assigned to manage product and service master data, so this step has no owner. How should it be handled?
- a) Record it now as work Configure-Price-Quote owns, and assign a named owner once Configure-Price-Quote sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Configure-Price-Quote decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

## Optional (will not hold up the build)

q13: Flagship CPQ vendors model a few entities CPQ does not yet capture: guided-selling questionnaires (saved scripts that route the seller), proposal templates (the sell-side document distinct from a contract draft), price books (environment groupings that wrap pricing rules), and deal-scoring records (per-quote AI margin and win-probability output). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules and skill exist. These are common across Salesforce CPQ, DealHub, Conga, Oracle, SAP, and Tacton, though each still wants a verification pass. Note that price books are already carried as a synonym alias on pricing rules.

a13:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3 q4=B2-S4.quotediscountlock q5=B2-S4.contractdraftlock q6=B2-S4.quotepii q7=B2-S5 q8=B2-S6 q9=B2-H1r-204 q10=B2-H1r-517 q11=B2-H1r-527 q12=B2-H1r-1236 q13=B3-E1+B3-E2+B3-E3+B3-E4 q14=B2-B9D-OWN-149 q15=B2-B9D-OWN-115 | domain_id=73 -->
