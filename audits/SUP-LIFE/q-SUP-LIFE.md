# Supplier Lifecycle Management (SUP-LIFE): questions waiting for you

## What this domain is
Onboard new suppliers, qualify them against your standards, and monitor performance and risk on one supplier record.

Run supplier onboarding from invite through KYC, banking, tax, and sanctions checks. Capture insurance, ISO, and SOC certifications with automatic expiry alerts so renewals never lapse. Score supplier performance against delivery, quality, and SLA targets, and roll those KPIs into tiered scorecards your category managers and finance teams share. Assess supplier risk on financial, ESG, cyber, and operational axes, and escalate elevated scores to GRC and procurement for re-qualification or replacement.

---

q1: (answer this first) How should Supplier Lifecycle Management be split into modules (the sub-areas of the product)?

- a) Four modules: Supplier Master (the core supplier record and self-service portal); Onboarding and Qualification (onboarding, qualification, and certification tracking together); Performance (scorecards and SLA monitoring); Risk (the supplier risk overlay).
- b) Three modules: same as (a) but fold Risk into Performance.
- c) Five modules: same as (a) but promote Certification Tracking out of Onboarding and Qualification into its own module.
- d) A custom boundary you specify.

Recommended: a. The flagship platforms package this market exactly four ways: HICX, SAP Ariba SLP, Coupa SIM, Ivalua, and Jaggaer each carry a supplier master record plus self-service portal (MASTER), bundle onboarding, qualification, and certification into one gating workflow set (ONBOARDING-QUAL), and present scorecards and SLA monitoring as a performance surface (PERFORMANCE); supplier risk sits on its own, sold by Ariba as a separate Supplier Risk add-on layered on SLP rather than folded into performance (RISK), which is why (a) keeps it distinct rather than (b). The 3-module fold (b) would collapse that risk overlay into performance against how the vendors ship it, and the 5-module split (c) would promote certification tracking, which the same vendors keep inside qualification.

a1:

---

q2: Should the supplier record be treated as holding personal data, since supplier contacts include named people and their emails? (yes/no)

Recommended: yes. Supplier contacts are personal data and fall under retention and privacy rules.

a2:

---

q3: Should a supplier qualification be frozen once it is approved, so the approved questionnaire cannot quietly change afterward? (yes/no)

Recommended: yes. Locking the approved qualification preserves an accurate record of what was approved.

a3:

---

q4: Should each supplier qualification require a single named approver (one Procurement or Compliance owner)? (yes/no)

Recommended: yes. A single accountable approver per qualification is standard practice.

a4:

---

q5: Should an uploaded supplier certification document be frozen once uploaded, so the certificate on file cannot be silently swapped? (yes/no)

Recommended: yes. The certificate is evidence, so it should stay immutable after upload.

a5:

---

q6: Should each supplier risk assessment require a single named approver (a designated GRC reviewer who signs off the score)? (yes/no)

Recommended: yes. A designated GRC reviewer owning the score keeps risk decisions accountable.

a6:

---

q7: How should the Supply Chain Risk Management (SCRM) market candidate be handled?

- a) Promote SCRM as its own new domain.
- b) Fold it into the supplier Risk module as a sub-feature.
- c) Fold it into the third-party risk domain (TPRM).
- d) Reject it, because the supplier Risk module plus TPRM already cover it.

Recommended: d, with a leaning toward b if you want the deep supply-chain-disruption specialists (Resilinc, Interos, Prewave, Everstream) represented. The existing supplier Risk module and TPRM already cover most of this surface, so a separate domain is hard to justify yet.

a7:

---

q8: The four supplier handoffs that feed your sourcing and procurement neighbors are tagged today with a generic parent process. Should I replace those four generic tags with their more specific child processes (certify and validate suppliers; monitor and manage supplier information; analyze supplier performance)? (yes/no)

Recommended: yes. The specific child processes describe these handoffs more precisely. Replacing the existing tags overwrites current rows, so it needs your sign-off.

a8:

---

q9: One already-curated handoff (id 591) is tagged with the generic parent process. Should I replace it with the more specific "monitor and manage supplier information" process? (yes/no)

Recommended: yes. The child process is the more accurate fit. Replacing the existing tag overwrites a value, so it needs your call.

a9:

---

## Optional (will not hold up the build)

q10: Five extra supplier objects show up across the flagship supplier platforms (a per-supplier contact roster, qualification questionnaires as first-class records, sanctions and watchlist screening events, supplier diversity classifications, and supplier-side audits with corrective-action plans). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and best done after the modules exist so each new object anchors to the right module at insert time. Several map to regulations already linked to this domain (anti-money-laundering and the Bank Secrecy Act), though they still want a verification pass first.

a10:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2.suppliers_pii q3=B2-S2.qual_submitlock q4=B2-S2.qual_approver q5=B2-S2.cert_submitlock q6=B2-S2.risk_approver q7=B2-S4 q8=B2-H1.parents q9=B2-H1.row591 q10=B3-1+B3-2+B3-3+B3-4+B3-5 | domain_id=28 -->
