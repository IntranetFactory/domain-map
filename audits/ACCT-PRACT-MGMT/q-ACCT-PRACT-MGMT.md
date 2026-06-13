# Accounting Practice Management (ACCT-PRACT-MGMT): questions waiting for you

## What this domain is
Run a CPA or tax firm end to end: client engagements, tax-return preparation and filing, the client portal, and time plus billing.

Manage the full life of every engagement, from the proposal and signed engagement letter through the recurring tax-prep workflow against the tax calendar, partner review and sign-off, e-filing, and IRS acceptance. Give clients a secure portal for documents and e-signature, capture staff time, and bill it, all while honoring preparer obligations (IRS Pub 4557, GLBA, AICPA independence) and document-retention rules.

---

q1: (answer this first) How should Accounting Practice Management be split into modules (the sub-areas of the product)?

- a) Keep three modules: Engagement Workflow, Tax-Return Prep, and Client Portal plus Billing (the current shape; every capability is placed and both core records have a clear home).
- b) Refine to five modules: carve out a dedicated Tax Returns module, an Engagement-Letter Management module, and a Client Portal module from the three above (do this after the new records in the Optional section are loaded).
- c) Refine to six modules: option (b) plus a dedicated Deadline Management module for the tax-calendar engine.
- d) Refine to seven modules: option (c) plus an Intake and Conflict-Check module for client-acceptance and independence checks.

Recommended: a. The richer five-to-seven-module shapes need records that do not exist yet (workflow templates and tasks, proposals, client documents and messages, invoices and payments), so they only become realizable after the Optional records are loaded. This choice drives every module below it, so it unlocks the rest of the build.

a1:

---

q2: Should the tax-return record be flagged as holding personal data, locked after filing, and requiring a single approver before filing? (yes/no)

Recommended: yes. A federal tax return carries some of the most sensitive personal data in the catalog (SSNs, dependents, income, account numbers), is effectively immutable once filed and accepted by the IRS, and near-universally needs partner sign-off before filing.

a2:

---

q3: Should the client-engagement record be flagged as requiring a single approver (partner-led engagement acceptance)? (yes/no)

Recommended: yes. Opening an engagement near-universally needs partner sign-off in CPA practice.

a3:

---

q4: What should happen to the handoff that fires when a tax return is filed but carries a supplier-invoice payload (it is mis-modeled today)?

- a) Keep it and reframe it as creating an accounts-payable item for the IRS filing fee or the e-file vendor.
- b) Rewire it to fire on a future "tax invoice issued" event on a billing record (an Optional record).
- c) Retarget it from accounts-payable automation to the finance ERP if the intent is to create a receivable profile.
- d) Delete it (mis-model, no legitimate consumer).

Recommended: d. The trigger event and the payload do not pair cleanly, and the narrative reading is that this handoff is mis-modeled with no real consumer.

a4:

---

q5: How should the engagement-letter record be owned, given it is shared with the legal-practice domain today?

- a) Leave it consolidated as one shared record that both the accounting and legal domains contribute to and consume.
- b) Split it into a separate accounting-mastered engagement-letter record plus a legal-mastered one.
- c) Rename it to a professional engagement-letter record with both domains contributing under sub-types.

Recommended: a. Leaving it consolidated is the current shape and the least disruptive, though the differing CPA-side (AICPA SSARS) and law-side (ABA Model Rules) retention and obligation rules are the reason this is worth your call.

a5:

---

q6: How should the duplicate, wrong-fit process tag on the engagement-letter handoff be resolved?

- a) Delete the wrong-fit tag so the corrected "Manage contracts" tag becomes the canonical one.
- b) Repoint the wrong-fit tag to "Manage contracts" and delete the corrected duplicate tag.
- c) Mark the wrong-fit tag as rejected and leave both rows in place.

Recommended: a. The corrected tag already exists, so dropping the wrong-fit row cleanly removes the duplicate coverage that distorts process-health reporting.

a6:

---

q7: What is the intended scope of the supplier-invoice contributor role on this domain?

- a) The firm's own accounts payable (the firm paying its vendors); keep the row with a conditional inbound feed.
- b) Client-side supplier invoices the firm processes as a bookkeeper; move it to a future bookkeeping-services module.
- c) Erroneous; delete the contributor row.

Recommended: a. The firm's own accounts payable is the most natural reading of the contributor link, and it keeps the inbound dependency intact rather than removing data.

a7:

---

q8: Which cross-vendor aliases should be added for the tax-return and client-engagement records?

- a) Add tax-return form-code aliases (1040, 1120, 1065, 1041, 990) and client-engagement industry-term aliases ("Engagement" universal, "Job" Jetpack, "Matter" legal-adjacent, "Project" PM-flavored), each with an alias type.
- b) Add only the most load-bearing aliases (the form codes plus "Engagement").
- c) Defer all aliases for now.

Recommended: a. These are the standard cross-vendor and cross-industry synonyms ("Engagement" is essentially the canonical industry term), and adding them improves catalog matching with no downside.

a8:

---

q9: A filed tax return is handed to the compliance domain, and the catalog maps that to the "prepare tax returns" process owned by this domain, but no one here is assigned to that work yet (no workflow states, no people). Record it now as work this domain owns? (yes/no)

Recommended: yes. Recording it now means the moment you decide who prepares returns, this step already has a named owner instead of resurfacing later as a gap. Assigning the actual person depends on the same lifecycle and people setup as the tax-return workflow questions above.

a9:

---

q10: The "tax return filed" handoff to the compliance domain currently carries two process tags: a broad "Process taxes" tag and a more specific "Prepare tax returns" tag. Which should be the single canonical tag, and the other deleted?

- a) Keep the broad "Process taxes" tag and delete the specific one (this handoff is the filing event, not the preparation work).
- b) Keep the specific "Prepare tax returns" tag and delete the broad one (prefer the most specific match).
- c) Leave both tags in place (no deletion).

Recommended: a. The handoff fires when the return is filed, which is the filing emission rather than the preparation activity, so the broader process is the better home. Either deletion needs your sign-off because removing a row is destructive.

a10:

---

## Optional (will not hold up the build)

q11: Should I research and add the workflow records (workflow templates, workflow tasks, capacity forecasts, tax-calendar deadlines) so the Engagement Workflow module holds real domain-owned data? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Evidence: Karbon, Jetpack Workflow, Canopy, CCH Axcess Practice.

a11:

---

q12: Should I research and add the engagement-letter records (proposals, engagement-acceptance checks, e-signature envelopes)? (yes/no)

Recommended: yes, but additive. Distinguishes the pre-signing proposal from the signed letter and adds independence and KYC checks. Evidence: Karbon, Ignition, TaxDome, Canopy.

a12:

---

q13: Should I research and add the client-portal records (client documents, client messages)? (yes/no)

Recommended: yes, but additive. Document retention per IRS Pub 4557 and secure messaging as a distinct audit-trail record. Evidence: TaxDome, Liscio, Canopy.

a13:

---

q14: Should I research and add the billing records (invoices, payment transactions, retainer balances)? (yes/no)

Recommended: yes, but additive. Retainer balances are a CPA-specific construct, similar to but distinct from law-firm trust accounting. Evidence: Aiwyn, TaxDome, Ignition, Canopy.

a14:

---

q15: Should client-acceptance and conflict checking be a standalone Intake and Conflict-Check module rather than a feature inside Engagement Workflow? (yes/no)

Recommended: yes only if you also picked the seven-module shape in q1; otherwise fold it into Engagement Workflow. Evidence: Karbon, Ignition.

a15:

---

q16: Should I add tax-research records (tax-research queries, tax-authority correspondence), or do these belong to the tax-prep software rather than practice management? (yes/no)

Recommended: no for now. These plausibly live in the tax-prep tooling (UltraTax, CCH Axcess Tax) rather than the practice-management buyer; defer pending vendor evidence. Evidence: Thomson Reuters Checkpoint, Bloomberg Tax.

a16:

---

<!-- agent map, ignore: q1=B2-MODULE-SHAPE-REFINE q2=B2-PATTERN-FLAGS.taxreturns q3=B2-PATTERN-FLAGS.clientengagements q4=B2-HANDOFF-340-PAYLOAD q5=B2-LETTERS-OWNERSHIP q6=B2-WRONG-FIT-APQC q7=B2-SUPPLIER-INV-CONTRIBUTOR q8=B2-ALIAS-SHAPE q9=B2-B9D-OWN-1505 q10=B2-HANDOFF-338-APQC-GRAIN q11=B3-WORKFLOW-MASTERS q12=B3-ENGAGEMENT-LTR-MASTERS q13=B3-CLIENT-PORTAL-MASTERS q14=B3-BILLING-MASTERS q15=B3-INTAKE-CONFLICT-MODULE q16=B3-TAX-RESEARCH | domain_id=152 -->
