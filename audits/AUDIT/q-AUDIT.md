# Audit Management (AUDIT): questions waiting for you

## What this domain is
Plan, run, and report internal audits from one place. Build the audit universe, score risk, schedule engagements, execute fieldwork with work papers and control tests, raise findings and recommendations, and follow remediation through to closure. Issue audit reports to management and the audit committee, and feed control deficiencies and assurance results back to governance, risk, and finance.

---

q1: (answer this first) How should Audit Management be split into modules (the sub-areas of the product)?

- a) Two modules: Plan and Engage (audit universe, risk scoring, planning, engagements, work papers, control tests) and Findings and Reporting (findings, recommendations, reports, follow-up actions).
- b) Three modules: Universe and Risk (audit universe and risk assessment), Fieldwork (engagements, work papers, control tests, evidence), and Issues and Reporting (findings, recommendations, reports, follow-up actions).

Recommended: a. The two-module split is the lighter shape and matches how AuditBoard and TeamMate+ separate planning and fieldwork from issue management. Three modules give cleaner role surfaces but roughly double the cross-module handoffs. This choice drives every module, capability, lifecycle owner, and per-module link below it, so it unlocks the rest of the build.

a1:

---

q2: Where should management responses, audit committee meetings, and audit-scoped risk assessments live?

- a) AUDIT (the audit-focused vendor products put them here)
- b) GRC (enterprise buyers often have GRC master them)
- c) Mixed, deciding per entity

Recommended: a. The vendor surface puts these in audit-focused products. Pick GRC or Mixed if your enterprise already runs GRC as the system of record for these objects. This decides where several missing entities land.

a2:

---

q3: For the 13 inbound handoffs whose payloads Audit does not yet model, how should each receiving module record the dependency?

- a) Load a lightweight consumer record per payload (captures the dependency)
- b) Accept all 13 as domain-level signals with no module owner
- c) Mixed, deciding per payload

Recommended: a. Loading a consumer record per payload captures the cross-domain dependency cleanly. Choose Mixed only if some of those inbound payloads are truly incidental to Audit.

a3:

---

q4: How should the bare-word names "work papers" and "control tests" be handled?

- a) Claim them as canonical (Audit owns both terms) and record the rationale
- b) Rename to the prefixed forms (audit work papers, audit control tests)
- c) Mixed, claiming one and renaming the other

Recommended: c. Work papers is largely an audit-only term and can be claimed canonical, but control tests overlaps the control-test concept GRC also uses, so renaming that one avoids a collision.

a4:

---

q5: Should audit reports require a single named approver to sign them off? (yes/no)

Recommended: yes. An audit report is signed off by an accountable owner (typically the audit-committee chair), so a single-approver gate matches real practice.

a5:

---

q6: Should work papers be frozen once submitted, so a signed-off work paper cannot be quietly edited? (yes/no)

Recommended: yes. A signed-off work paper is the evidence of record and should lock on submission.

a6:

---

q7: Should audit findings be frozen once submitted, so an issued finding cannot be quietly edited? (yes/no)

Recommended: yes. An issued finding drives management response and remediation, so it should stay stable after submission.

a7:

---

q8: Should audit engagements be frozen once completed, so a closed engagement cannot be re-edited? (yes/no)

Recommended: yes. AuditBoard locks engagements after completion; TeamMate+ keeps them editable, so this is a genuine product-shape call. Default to locking for a cleaner audit trail.

a8:

---

q9: Two cross-domain handoff tags look semantically wrong (one finding tagged with a warranty process, one records-retention handoff tagged "Document trade"). How should they be handled?

- a) Delete the two bad tags and surface them for re-tagging
- b) Leave them in place for a human reviewer to reject during the review pass

Recommended: a. The tags came from a substring mismatch and carry no real meaning. Deleting them is a destructive change, so it needs your sign-off.

a9:

---

q10: There is a self-referencing relationship on audit findings with an unclear verb ("imports") that no tooling reads. How should it be handled?

- a) Delete it (no documented intent)
- b) Keep it as a carry-forward concept and rewrite the verb to something clear like "carries forward from"

Recommended: a. The relationship has no documented purpose and is invisible to downstream tooling. Both options are destructive (a delete or a verb overwrite), so either needs your sign-off.

a10:

---

q11: Audit has five heavy neighbor domains (GRC, finance, performance management, ESG, legal). How much cross-domain reconciliation should run now?

- a) Run the full reconciliation for all five neighbors now
- b) Defer it to a follow-up audit
- c) Run it only for the two heaviest neighbors (GRC and finance)

Recommended: b. The domain has no modules yet, so cross-module reconciliation mostly produces empty-link noise today. Defer until the build lands.

a11:

---

q12: Should Audit Management stay a first-class peer domain, or fold into GRC as a sub-module?

- a) Keep it as a peer domain
- b) Fold it into GRC as a sub-module

Recommended: a. Three or more independent pure-play vendors (AuditBoard, TeamMate+, Workiva) keep audit as its own market, which satisfies the peer-domain rule. It currently sits under GRC, so keeping it peer is the recommended confirmation.

a12:

---

## Optional (will not hold up the build)

q13: Several universal vendor entities are not modeled yet (audit universe entities, audit-side risk assessments, audit evidence, audit programs, audit samples, management responses, audit committee meetings, plus deeper candidates like questionnaires, walkthroughs, control narratives, assertions, sampling methods, time entries, QAR assessments, audit metrics, engagement workflows, and auditee contacts). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are common across the flagship vendor set, though each still wants a verification pass first.

a13:

---

<!-- agent map, ignore: q1=B2-MOD-SHAPE q2=B2-AUDIT-VS-GRC q3=B2-NOROLE-PAYLOADS q4=B2-B3-NAMING q5=B2-PATTERN-FLAGS.reportapprover q6=B2-PATTERN-FLAGS.workpaperlock q7=B2-PATTERN-FLAGS.findinglock q8=B2-PATTERN-FLAGS.engagementlock q9=B2-BAD-TAGS q10=B2-SELF-LOOP q11=B2-PAIRWISE q12=B2-DOMAIN-PEER q13=B3 | domain_id=16 -->
