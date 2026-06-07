# Governance, Risk and Compliance (GRC): questions waiting for you

## What this domain is
Manage enterprise risk, controls, policies, and compliance obligations in one place. Identify and assess risks, define and test the controls that mitigate them, track regulatory obligations (SOX, ISO 27001, SOC 2, NIST CSF), and run policy attestation and audit-issue remediation. Turn scattered spreadsheets and point checks into a governed, evidence-backed program that can prove compliance on demand.

---

q1: (answer this first) How should GRC be split into modules (the sub-areas of the product)?

- a) Three modules: Risk Management (compliance risks and risk assessments); Compliance Management (obligations, controls, control assessments, evidence, audit issues, remediation plans); Policy and Attestation (policies and attestations).
- b) Two modules: Risk Management, and a combined Compliance and Policy module.
- c) Four modules: same as (a) but split Evidence and Audit (evidence, audit issues, remediation plans) out of Compliance Management into its own module.

Recommended: a. The three-module split is how the flagship GRC suites (ServiceNow IRM, Archer, MetricStream, OneTrust, AuditBoard) present the product, and it keeps each area small enough to own cleanly. This choice drives every module, lifecycle, persona, and per-module link below it, so it unlocks the rest of the build.

a1:

---

q2: Should GRC keep its link to the Compliance Training capability, or hand that to LMS as the sole owner?

- a) Keep it, and realize it through the Policy and Attestation module.
- b) Remove the link; GRC keeps only the capabilities it actually masters, and LMS owns training delivery.

Recommended: b. None of the flagship GRC vendors own training delivery; they all integrate with LMS and consume the attestation completion record as evidence. This also gates the build, so it needs your call before modules land.

a2:

---

q3: The 10 outbound process tags on GRC handoffs are authored but unapproved. Should they be promoted to approved? (yes/no)

Recommended: yes, if you agree the process mappings are correct. Promotion to approved is a sign-off step, so it is never applied automatically.

a3:

---

q4: The Compliance Evidence object is labeled with the plural "Compliance Evidences". Should it be renamed (for example to "Compliance Evidence Items")? (yes/no)

Recommended: no. It counts artifact rows, and the catalog convention is plural-noun labels, so leaving it as-is is the standing default. A rename overwrites a current value, so it needs your confirmation either way.

a4:

---

q5: The 11 GRC domain-to-object rows carry notes that just restate role and intent. Were these notes user-approved at load time, or auto-populated (and should be cleared)?

- a) User-approved, leave them in place.
- b) Auto-populated, clear all 11 to empty and log the cleanup.

Recommended: b. These are exactly the mechanical, restated-schema annotations the notes-hygiene rule rescinds, and the rollup rows are deleted anyway once the domain is modularized. Clearing them overwrites current values, so it needs your call.

a5:

---

q6: Two inbound handoffs (634 from ITAM, 1195 from APM) carry "target NULL until GRC is modularized" note trailers that will become factually wrong once GRC has modules. How should they be handled?

- a) Report-only; defer to the source domain audits that own those rows.
- b) Surgically patch the 2 explicit trailers now and defer the rest.

Recommended: a. The source domains own the authoring of their handoff rows, so deferring keeps ownership clean. This edits values another domain owns, so it needs your sign-off.

a6:

---

q7: Should a policy be frozen once published and an attestation frozen once required, so the live compliance record cannot be quietly edited? (yes/no)

Recommended: yes. Published policies and issued attestation requirements are the evidence trail; locking them keeps that trail trustworthy. This sets a current value, so it needs your confirmation.

a7:

---

q8: Should audit issues and remediation plans each have a single named approver who signs off before they close? (yes/no)

Recommended: yes. A single accountable approver on closure is standard control practice and keeps issues from being quietly closed.

a8:

---

q9: Should compliance evidence be treated as containing personal data, and should the other masters (risks, controls, obligations) be marked as not holding personal content? (yes/no)

Recommended: yes for evidence (attachments often contain personal data and fall under retention rules); no personal-content flag on the rest. This sets current values, so it needs your confirmation.

a9:

---

q10: What is the architectural intent for compliance risks, which several adjacent domains also touch?

- a) Keep it single-master; GRC stays the canonical owner.
- b) Split it into per-domain risk slices (cyber, supplier, operational, privacy risks) in separate objects.
- c) Promote it to a master cluster where GRC masters the package and the adjacent domains hold slice masters.

Recommended: a. Keeping it single-master avoids a premature split before the four neighbor domains (OP-RES, TPRM, SECOPS, PRIV-MGMT) are audited, and the cluster move can happen later if their audits warrant it.

a10:

---

q11: Should the 2 existing GRC-tagged roles stay tagged to GRC, and should 5 new GRC-module persona roles (Risk Manager, Compliance Officer, Policy Owner, Control Owner, Attestation Campaign Manager) be authored?

- a) Leave the 2 roles tagged GRC and author the 5 new module roles.
- b) Re-tag the 2 roles to LMS / PLM business functions; the GRC role inventory starts from zero.

Recommended: a. The 2 roles belong to the GRC business function even though they currently target adjacent modules, and the 5 persona roles are needed once the modules exist.

a11:

---

## Optional (will not hold up the build)

q12: Flagship GRC vendors carry several masters GRC does not model yet (risk treatments, control and risk libraries, KRI metrics, control tests, gap assessments, an audit-findings vs audit-issues split, disclosure filings, risk appetite statements, regulatory change events, policy exceptions). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are common across the vendor set, though they still want a verification pass first.

a12:

---

q13: Some vendor stacks split audit findings (owned by Audit) from audit issues (owned by GRC), with an edge between them. Should GRC keep audit issues as its own master and link to an Audit-owned findings object? (yes/no)

Recommended: yes in principle, but it depends on the Audit domain's own audit landing first. Additive and non-blocking.

a13:

---

q14: Four spin-off domain candidates are queued from this audit (Cyber Risk Quantification, Ethics Hotline, Policy Management, Regulatory Change Management). Should I keep them on the missing-domains list for separate triage? (yes/no)

Recommended: yes. Each passes the point-solution-market test; final triage is a separate human decision and does not affect the GRC build.

a14:

---

<!-- agent map, ignore: q1=B3-2 q2=B2-5 q3=B1A-APQC-PROMOTE q4=B1A-S10 q5=B2-1 q6=B2-3 q7=B2-4.submitlock q8=B2-4.singleapprover q9=B2-4.personalcontent q10=B2-6 q11=B2-7 q12=B3-1 q13=B3-3 q14=B3-4 | domain_id=15 -->
