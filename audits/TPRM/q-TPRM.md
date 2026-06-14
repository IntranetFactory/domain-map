# Third-Party Risk Management (TPRM): questions waiting for you

## What this domain is
Know who you do business with, prove they are safe before you sign, and catch the risks that surface after the contract goes live.

Third-Party Risk Management runs the full lifecycle of vetting and watching the vendors, suppliers, and service providers your organization depends on. Onboard a new third party, classify it by how critical it is and how much data or access it touches, then run the due diligence the tier demands: security questionnaires, document collection, certification checks, and a clear go or no-go before the contract is signed. After onboarding, keep watching: re-assess on a cadence set by the vendor's tier, ingest external security-rating and breach signals, and turn findings into tracked remediation that closes before the next review cycle or contract renewal. It gives risk, procurement, and security teams one defensible record of every third party, the evidence behind each decision, and the open issues that still need to close.

---

q1: (answer this first) How should Third-Party Risk Management be split into modules (the sub-areas of the product)?

- a) Single module covering the full vendor-risk lifecycle (assessment, ongoing monitoring, and remediation in one place). Simpler, and it defers any split until the capability count forces it.
- b) Split into two modules: Vendor Due Diligence (onboarding, questionnaires, tier classification, the go or no-go before signing) and Vendor Ongoing Monitoring (re-assessment cadence, security-rating and breach signals, remediation tracking).

Recommended: b. OneTrust Third-Party Risk, ProcessUnity, and Prevalent all carry separate Onboarding versus Continuous Monitoring product lines, so the due-diligence-versus-ongoing-monitoring split mirrors how the flagship pure-plays package the market, and it satisfies the two-module floor up front. This decision gates the entire build and every fix below it, so it unlocks the rest of the work.

a1:

---

q2: Where should vendor risk assessments live, given that another domain already owns general risk assessments?

- a) This domain masters a new, distinct vendor-risk-assessment record (its own inputs: questionnaires plus security ratings).
- b) This domain reuses the existing general risk-assessment record with a "vendor" marker on it.
- c) This domain reuses the supplier-risk-assessment record from the supplier-lifecycle domain, and the whole TPRM domain is folded into that domain instead.

Recommended: a. Vendor risk has distinct inputs and reviewers (procurement and infosec, not internal control testing), so a dedicated master keeps the vendor-specific fields and joins intact.

a2:

---

q3: How should the "vendor" record relate to the existing "supplier" record (a naming collision, since the supplier record is already aliased "vendor")?

- a) Reuse the existing supplier record as the single master across the org.
- b) Master a separate "third parties" record scoped to risk-managed counterparties only.
- c) Introduce a new shared master-data "counterparties" record that both the supplier domain and this domain consume.

Recommended: a. A single shared master is the cleanest outcome and avoids a known overlap that would need alias and relationship mapping. Pick (b) or (c) only if risk-managed counterparties genuinely differ from invoiced suppliers in your org.

a3:

---

q4: The supplier-risk-assessment record is aliased "TPRM assessment" and "due diligence review" (clearly vendor-coded) but is currently owned by the supplier-lifecycle domain. Who should own it?

- a) Move ownership to this domain (the record stays; only the mastery moves once a module exists).
- b) Keep ownership with the supplier-lifecycle domain, and this domain just consumes it.
- c) Rename it to a vendor-risk-assessment record, move ownership here, and optionally leave the supplier domain a vendor-risk-aware variant.

Recommended: a. The aliases are TPRM-coded, so moving mastery to this domain matches what the record actually is.

a4:

---

q5: How broad should this domain be relative to the supplier-lifecycle domain, which already owns onboarding, qualifications, certifications, and scorecards?

- a) The supplier domain keeps mastering all of those, and this domain consumes everything (this domain becomes a thin overlay or analytics layer).
- b) This domain masters its own assessment and remediation records, and consumes the supplier-domain records as a consumer only.
- c) This domain is duplicative and gets folded into the supplier-lifecycle domain as a risk module.

Recommended: b. Owning the assessment and remediation records (where the vendor-risk workflow actually lives) while consuming the shared supplier masters keeps each domain in its lane without duplication.

a5:

---

q6: How should vendor risk findings relate to the existing general compliance-risk record owned by the governance domain?

- a) Vendor risk gets its own findings record.
- b) This domain consumes the existing compliance-risk record with a vendor marker.

Recommended: a. Vendor risks are a distinct subtype with a vendor-shaped relationship, so a dedicated record is cleaner. This relates to q2.

a6:

---

q7: When the audit domain sends a remediated finding to this domain, what should happen on receipt?

- a) This domain consumes the audit finding (as an optional consumer) and ties it to its vendor-remediation record.
- b) The handoff is mis-routed and should target the governance or audit domain itself.
- c) The handoff is correct and this domain should master its own distinct vendor-audit-finding record.

Recommended: a. Consuming the finding and linking it to vendor remediation matches the inbound signal, and it unblocks the routing fix for that handoff.

a7:

---

q8: How should DORA-specific third-party artifacts (the ICT-provider register, concentration analyses, and subcontractor mapping) be handled?

- a) Add them as new records in a follow-up pass once the modules exist.
- b) Treat DORA as out of scope here and remove the regulation link.
- c) Keep the regulation linked but defer authoring those records to a dedicated DORA-compliance audit.

Recommended: a. DORA is one of this domain's mandatory regulations and these artifacts are genuinely TPRM-side, so add them once there is a module to host them.

a8:

---

q9: The SaaS-management platform has its own vendor-risk slice. How should it relate to this domain?

- a) Keep it separate (it is SaaS-app-specific; this domain is generic vendor risk).
- b) Deprecate it once this domain masters vendor risk, and have the SaaS platform consume this domain's master.
- c) Keep both, with a documented consumer role on this domain's side.

Recommended: a. The SaaS-app-specific slice and the generic vendor-risk domain serve different scopes, so keeping them separate is the low-friction default.

a9:

---

q10: One inbound handoff carries a second, unexplained finer-grained process tag on top of the documented one, with no record of where it came from. How should it be resolved?

- a) Keep both tags (the broader and the finer-grained one are mutually consistent).
- b) Delete the finer-grained tag to keep the cleaner, broader framing.
- c) Approve both and promote the cleaner pair to approved, deciding the finer-grained tag's status separately.

Recommended: b. The cleaner broader framing is the preferred shape, but deleting the row is destructive and its surprise provenance is worth your sign-off rather than a silent removal, so this is surfaced rather than applied.

a10:

---

## Optional (will not hold up the build)

q11: Six vendor entities show up across the flagship pure-plays (vendor questionnaires, questionnaire responses, tier classifications, vendor remediations, subprocessors and their chains, and vendor security-rating snapshots). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist and the ownership boundary above is settled, since that decides which module owns each one.

a11:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B2-4 q5=B2-5 q6=B2-6 q7=B2-7 q8=B2-8 q9=B2-9 q10=B2-H1 q11=B3-1+B3-2+B3-3+B3-4+B3-5+B3-6 | domain_id=19 -->
