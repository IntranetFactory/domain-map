# Third-Party Risk Management (TPRM): questions waiting for you

## What this domain is

Know who you do business with, prove they are safe before you sign, and catch the risks that surface after the contract goes live.

Third-Party Risk Management runs the full lifecycle of vetting and watching the vendors, suppliers, and service providers your organization depends on. Onboard a new third party, classify it by how critical it is and how much data or access it touches, then run the due diligence the tier demands: security questionnaires, document collection, certification checks, and a clear go or no-go before the contract is signed.

After onboarding, keep watching. Re-assess on a cadence set by the vendor's tier, ingest external security-rating and breach signals, and turn findings into tracked remediation that closes before the next review cycle or contract renewal. Escalate the third parties that drift into higher risk so the right reviewers in procurement, security, and compliance see them in time.

---

q1: How should the SaaS-management platform's own per-app vendor-risk slice relate to TPRM now that TPRM masters the third-party identity?

The SaaS-management platform (SMP) carries its own app-scoped vendor-risk record (`smp_vendor_risk_assessments`, mastered by the SMP renewal module). TPRM now masters the broad `third_parties` identity. You asked: when both are installed, would you have one table or two, and which domain owns it?

- a) Keep SMP fully separate (SMP is SaaS-app-specific, TPRM is generic third-party risk, no shared identity).
- b) Deprecate the SMP slice and have the SMP module consume TPRM's third-party master.
- c) The SMP module carries a local embedded-master shell of TPRM's `third_parties` (installs standalone without TPRM, defers to TPRM's master when TPRM is present) but keeps its own app-specific assessment slice.

Recommended: c. On your one-table-or-two question: with the embedded-master shape (c) there is ONE logical `third_parties` table, mastered by TPRM. SMP carries a local shell only so it can deploy standalone without TPRM, and when both are installed SMP's shell defers to TPRM's master, so you have one table owned by TPRM. You get two only if SMP is installed without TPRM, where its shell is then the local copy. The assessment slices stay separate either way: TPRM's `third_party_assessments` and SMP's `smp_vendor_risk_assessments` are distinct records by design. The grounding: SaaS-management platforms like Zluri, Torii, and BetterCloud are app-scoped, they discover the SaaS estate via SSO, API, and browser signals, govern usage and spend, and run a lightweight per-app security review, whereas a dedicated TPRM like Prevalent, OneTrust, ServiceNow VRM, Venminder, ProcessUnity, or Archer runs deep, structured diligence across the whole third-party ecosystem, not just SaaS apps. So the SMP slice is genuinely its own app-specific record and should not be deprecated (that rules out b), but the third-party identity it points at is the same entity TPRM masters, so SMP embedded-masters that identity while keeping its own assessment slice. Pick a only if you want them fully decoupled with no shared identity. This is an SMP-side change and does not affect TPRM's own records.

a1:

---

<!-- agent map, ignore: q1=B2-9 | domain_id=19 -->
