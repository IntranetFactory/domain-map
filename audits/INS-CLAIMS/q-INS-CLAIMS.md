# Insurance Claims Management (INS-CLAIMS): questions waiting for you

## What this domain is
Take every claim from first notice of loss through settlement, payment, and recovery in one place.

Handle the whole claim from the moment a loss is reported. Capture first notice of loss, verify coverage against the policy, assign the right adjuster, and keep the case file complete as the investigation unfolds. Set and adjust reserves, adjudicate the coverage decision, agree the settlement, and disburse payment with a clean audit trail at every step. Screen for fraud early, open a special investigation when the indicators warrant it, and pursue subrogation and salvage to recover what is owed. Claims teams cut cycle time and leakage, treat claimants fairly and consistently, and stay ready for state and federal claims-handling scrutiny.

---

q1: (answer this first) How should Insurance Claims Management be split into modules (the sub-areas of the product)?

- a) Four modules: Intake (FNOL, parties, documents, telematics ingest); Adjudication (reserves, exposures, adjuster work-list, coverage decisions); Payments (settlements, disbursements, recovery disbursements); Compliance and Fraud (SIU, regulatory reporting).
- b) Five modules: Intake; Adjudication; Payments; Recovery (subrogation, salvage, recovery disbursements); Fraud and SIU.
- c) Five modules variant: as (b), but lift Compliance and Reporting into its own module (regulatory claim reports, denial-letter audit trail, NAIC and state-DOI artifacts).

Recommended: c. The flagship claims platforms all carry a four-to-five module split internally, and option (c) is the most defensible under DORA, IFRS 17, and NAIC Model #900 scrutiny. This choice drives the build, the capability set, every lifecycle owner, and every module FK below it, so it unlocks the rest of the build.

a1:

---

q2: insurance_policies and policy_coverages are mastered on this domain today, but the flagship vendors carry them on a separate Policy Administration platform (which is queued). What is the interim ownership?

- a) Keep them on Insurance Claims Management until Insurance Policy Administration ships, then move them at promotion time.
- b) Move them now to a stub Insurance Policy Administration that carries only those two masters until the rest is loaded.
- c) Embed them in claims as a local shell, with Insurance Policy Administration as the canonical owner once it lands.

Recommended: a. It is the honest reflection of the current catalog scope and avoids shipping a sparse stub domain before its time.

a2:

---

q3: Who should own claims in the functional spine? Owner is Business Operations today, with Finance as contributor.

- a) Keep the current Business Operations owner plus Finance contributor.
- b) Add Risk and Compliance as a contributor and Customer Service as a consumer (lightweight, no new spine rows).
- c) Decompose Business Operations to add a Claims Operations sub-function, then re-model the ownership against it.

Recommended: b. It captures the real claims RACI (Finance and Risk contribute, Customer Service consumes) without needing a new function-spine row first.

a3:

---

q4: How should the regulation set be adjusted? NAIC Unfair Claims Settlement Practices Model #900, the most important U.S. claims-handling regulation, is currently missing; a few existing rows (SFDR, eIDAS, FATCA) are firm-level rather than claims-specific.

- a) Add NAIC Model #900 and keep all 11 existing rows.
- b) Add NAIC Model #900 and prune the firm-level rows (SFDR, eIDAS, FATCA).

Recommended: b. Adding the key claims regulation while pruning the firm-level rows keeps the regulation set focused on claims handling. Pruning removes existing rows, so it needs your sign-off.

a4:

---

q5: How should the cross-domain handoffs be tagged to a process taxonomy? The standard cross-industry PCF has weak claims coverage (only the fraud-investigation handoff is a clean match).

- a) Tag with the closest cross-industry PCF processes now, accepting low-confidence tags on the GL-posting handoffs.
- b) Defer all tagging until the PCF Insurance vertical taxonomy is loaded.
- c) Author custom insurance process rows (process FNOL, adjudicate coverage, set reserve) and tag against those.

Recommended: a. It gets the handoffs tagged now; the weak GL-posting matches can be revisited when a richer taxonomy lands. Pick (b) if you would rather wait for clean insurance-specific activities.

a5:

---

q6: Two masters were classified as non-workflow on the default assumption: loss_incidents and claim_adjuster_assignments. Confirm that, or treat them as workflow-bearing?

- a) Confirm both as non-workflow (current state, no change).
- b) Re-classify loss_incidents (reported, investigated, closed) and claim_adjuster_assignments (assigned, accepted, reassigned, completed) to workflow-bearing.
- c) Other; you name the per-master shape.

Recommended: a. The current classification is the standard config-shape reading and needs no change. Re-classifying overwrites an already-set value, so it stays your call.

a6:

---

q7: For the closed state of a claim, which permission name should the workflow gate derive?

- a) close_insurance_claim
- b) close_claim

Recommended: b. The shorter verb reads cleaner; the module prefix already carries the insurance context.

a7:

---

q8: For the approved state of a settlement, which permission name should the workflow gate derive?

- a) approve_claim_settlement
- b) approve_settlement

Recommended: b. The shorter verb reads cleaner within the claims module prefix.

a8:

---

q9: For the issued state of a payment, which permission name should the workflow gate derive?

- a) issue_claim_payment
- b) issue_payment

Recommended: b. The shorter verb reads cleaner within the claims module prefix.

a9:

---

q10: For the substantiated state of an SIU case, which permission name should the workflow gate derive?

- a) substantiate_siu_case
- b) substantiate_fraud_case

Recommended: no firm vote; both read well. Pick (a) to mirror the master name (siu_cases) or (b) for the plainer "fraud" wording.

a10:

---

q11: How should the industry-synonym aliases (about 30 across the masters) be reviewed before they are loaded?

- a) The agent authors the full tuple list and you approve it in one pass.
- b) Per-master review: the agent surfaces 3 to 5 aliases per master and you approve master by master.

Recommended: a. One pass is faster and the alias categories are already named per master; pick (b) if you want to vet each master individually.

a11:

---

q12: Should the privacy and approval pattern flags be flipped on three masters: has_personal_content on siu_cases (privacy-sensitive investigative records), has_single_approver on claim_settlements, and has_submit_lock on claim_payments? (yes/no)

Recommended: yes. The flips match the real shape of these records. Each flip overwrites a populated default boolean, so it needs your confirmation; it is also sequenced after the workflow-shape decision in q6.

a12:

---

## Optional (will not hold up the build)

q13: Twelve extra claims objects show up across the flagship vendors (claim reserves, claim exposures, claim activities, coverage decisions, denial letters, claim notes, loss estimates, claim documents, claim parties, regulatory claim reports, litigation files, recovery disbursements). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are universal across the vendor set, though they still want a verification pass first and they slot into modules that only exist once q1 is decided.

a13:

---

<!-- agent map, ignore: q1=B2-MOD-SPLIT q2=B2-POLICY-ADMIN-SCOPE q3=B2-FUNC-RACI q4=B2-REG-SCOPE q5=B2-APQC-STRATEGY q6=B2-LFC-EXEMPT q7=B2-B12-VERBS.closeclaim q8=B2-B12-VERBS.approvesettlement q9=B2-B12-VERBS.issuepayment q10=B2-B12-VERBS.substantiate q11=B2-B11-TUPLES q12=B1B-B4-PATTERN-FLAGS q13=B3-CLAIM-RESERVES+B3-CLAIM-EXPOSURES+B3-CLAIM-ACTIVITIES+B3-COVERAGE-DECISIONS+B3-DENIAL-LETTERS+B3-CLAIM-NOTES+B3-LOSS-ESTIMATES+B3-CLAIM-DOCUMENTS+B3-CLAIM-PARTIES+B3-REGULATORY-CLAIM-REPORTS+B3-LITIGATION-FILES+B3-RECOVERY-DISBURSEMENTS | domain_id=44 -->
