# Audit Management (AUDIT): questions waiting for you

## What this domain is
Plan, execute, and report internal audits from a risk-based plan through fieldwork, findings, and tracked remediation.

Run your internal audit function end to end. Build a risk-based annual plan, scope engagements, and assign teams, then carry out fieldwork with work papers and control tests that capture evidence as you go. When you raise a finding, route it for management response, agree on recommendations, and track follow-up actions to closure so nothing slips. Produce review-ready reports for leadership and the audit committee, and keep a defensible trail of who tested what, when, and with what result.

> Grounding: these recommendations are backed by a fresh Phase 0 vendor-surface study (5 flagship internal-audit vendors, 2025-2026 product docs) saved at `.tmp_deploy/AUDIT-phase0-2026-06-08.md`. Flagships studied: AuditBoard (OpsAudit + SOXHUB + RiskOversight), Wolters Kluwer TeamMate+, Workiva, Diligent HighBond (formerly ACL Galvanize), and the suite competitor ServiceNow IRM Audit Management. This is an assurance market, so SOX audit trails, segregation-of-duties records, and e-signed work papers are load-bearing compliance entities, not optional extras. No prior recommendation was reversed by the fresh evidence: the named-vendor surface confirms the earlier calls, but the reasoning below now cites which vendor packages the surface which way rather than generic "matches how vendors present their product" language.

---

q1: (answer this first) How should Audit Management be split into modules (the sub-areas of the product)?

- a) Two modules: Plan and Engage (audit universe, risk scoring, planning, engagements, audit programs, work papers, control tests, walkthroughs, samples, evidence) and Findings and Reporting (findings, management responses, recommendations, follow-up actions, reports, committee packs).

- b) Three modules: Universe and Risk (audit universe and audit-scoped risk assessment), Fieldwork (engagements, work papers, control tests, walkthroughs, evidence), and Issues and Reporting (findings, responses, recommendations, reports, follow-up actions).

Recommended: a. The two-module split is the vendor-majority cut. Four of the five flagships run the whole plan-to-report lifecycle on one engagement spine and split only at the planning-vs-issues seam: AuditBoard's OpsAudit covers planning through fieldwork through findings through reporting in one product (SOXHUB and RiskOversight are separate SOX-testing and risk-register surfaces, not a fieldwork-vs-issues split); TeamMate+ is a single end-to-end product "from establishing annual plans ... to closing the audit and follow up"; Workiva runs internal audit, SOX, and ESG assurance on one connected data layer; ServiceNow IRM treats audit as one workflow (plans group engagements, engagements carry tasks and observations). Only Diligent HighBond separates fieldwork (its Projects app) from issue management (its Results app) at the product-surface level, which is the case for three modules. Three modules give cleaner staff-auditor-vs-director role surfaces but roughly double the cross-module handoffs (about 8 vs about 3), and no flagship except HighBond reinforces the universe/risk-vs-fieldwork seam. This choice drives every module, capability, lifecycle owner, and per-module link below it, so it unlocks the rest of the build.

a1:

---

q2: Where should management responses, audit committee meetings, and audit-scoped risk assessments live?

- a) AUDIT (the audit-focused vendor products master them)
- b) GRC (enterprise buyers often have GRC master them)
- c) Mixed, deciding per entity

Recommended: a. The four pure-plays master all three inside their audit products: AuditBoard, TeamMate+, Workiva, and Diligent HighBond each capture management responses against findings, surface findings up to the audit committee (AuditBoard's committee aggregation, Workiva's "aggregate audit findings for their audit committee", HighBond's Storyboards committee/board reporting), and score audit-scoped risk per universe entity (AuditBoard RiskOversight, TeamMate+ Continuous Risk Assessment, Workiva Risk, HighBond risk). The one vendor that masters these outside an audit product is the suite competitor ServiceNow IRM, where controls, risks, and the committee surface belong to the wider IRM platform, not an audit-specific module. So the cut tracks pure-play vs suite: pick a (AUDIT) if you want the pure-play shape; pick GRC or Mixed only if your enterprise already runs GRC as the system of record for these objects (the ServiceNow IRM / Archer posture). Note that AUDIT masters the audit-scoped assessment of risk (the per-engagement risk score), not the enterprise risk register itself, which is consumed from GRC regardless. This decides where several missing entities land.

a2:

---

q3: For the 13 inbound handoffs whose payloads Audit does not yet model, how should each receiving module record the dependency?

- a) Load a lightweight consumer record per payload (captures the dependency)
- b) Accept all 13 as domain-level signals with no module owner
- c) Mixed, deciding per payload

Recommended: a. The flagship surface treats inbound auditable artifacts as evidence the engagement reads and tests against: every vendor's evidence-request and control-test workflow pulls source records (journal entries, invoice matches, expense lines, supplier risk assessments, court filings) into the engagement as testable evidence. Modeling each as a lightweight consumer record on the receiving module captures that dependency cleanly and lets the per-module attribution backfill resolve the target FK. Choose Mixed only for inbound payloads that are truly incidental to Audit (for example a one-off signal an engagement never actually tests).

a3:

---

q4: How should the bare-word names "work papers" and "control tests" be handled?

- a) Claim them as canonical (Audit owns both terms) and record the rationale
- b) Rename to the prefixed forms (audit work papers, audit control tests)
- c) Mixed, claiming one and renaming the other

Recommended: c. Work papers is an audit-specific term across the whole flagship surface (AuditBoard OpsAudit version-controlled work papers, TeamMate+ electronic working papers, Workiva internal-audit work papers, HighBond Projects work papers); no adjacent domain competes for the bare word, so Audit can claim it canonical. Control tests is different: control testing is shared between the audit products and the GRC/IRM suites that own the control library (ServiceNow IRM runs Control Test as one of its four task types; Workiva and AuditBoard test against GRC-owned controls). Because GRC has a legitimate claim on the control-test concept, rename that one to the prefixed form to avoid a collision. Claiming one and renaming the other matches who actually owns each term in the market.

a4:

---

q5: Should audit reports require a single named approver to sign them off? (yes/no)

Recommended: yes. The flagship surface treats the audit report as a signed-off artifact with an accountable owner: AuditBoard OpsAudit provides electronic sign-offs on reporting, and the report is the deliverable the audit committee receives (Workiva, HighBond Storyboards, ServiceNow committee packs). A single-approver gate (typically the chief audit executive or audit-committee chair) matches that real sign-off practice.

a5:

---

q6: Should work papers be frozen once submitted, so a signed-off work paper cannot be quietly edited? (yes/no)

Recommended: yes. Every flagship makes the signed-off work paper the evidence of record with an immutable trail: AuditBoard OpsAudit ships version-controlled work papers with electronic sign-offs, Workiva keeps "a full audit trail of all changes" granular to the narrative, and TeamMate+ manages electronic working papers as the controlled record. A submit-lock on sign-off is exactly the behavior these products exhibit.

a6:

---

q7: Should audit findings be frozen once submitted, so an issued finding cannot be quietly edited? (yes/no)

Recommended: yes. An issued finding drives the management response and the remediation/follow-up workflow across all five flagships (AuditBoard issue tracking with owners and deadlines, HighBond Results remediation workflow, ServiceNow observations-to-issues, Workiva findings aggregation, TeamMate+ issue tracking). Once issued, it is the artifact downstream parties respond to, so it should stay stable after submission.

a7:

---

q8: Should audit engagements be frozen once completed, so a closed engagement cannot be re-edited? (yes/no)

Recommended: yes (genuine product-shape call). The flagship surface is split here: AuditBoard locks engagements post-completion as part of its defensible audit trail, whereas TeamMate+ keeps engagement metadata editable through continuous risk assessment and multi-year planning. ServiceNow tracks an engagement's actual-vs-planned phase timeline that closes out per stage. Because the leaders genuinely differ, this is your call; default to locking for the cleaner audit trail (the AuditBoard posture), and choose no if you want the TeamMate+ ongoing-edit flexibility.

a8:

---

q9: Two cross-domain handoff tags look semantically wrong (one finding tagged with a warranty process, one records-retention handoff tagged "Document trade"). How should they be handled?

- a) Delete the two bad tags and surface them for re-tagging
- b) Leave them in place for a human reviewer to reject during the review pass

Recommended: a. The tags came from a substring mismatch (the matcher grabbed "recommendations" out of a warranty process, and "Document" out of a records-retention handoff) and carry no real meaning. Deleting them is a destructive change, so it needs your sign-off.

a9:

---

q10: There is a self-referencing relationship on audit findings with an unclear verb ("imports") that no tooling reads. How should it be handled?

- a) Delete it (no documented intent)
- b) Keep it as a carry-forward concept and rewrite the verb to something clear like "carries forward from"

Recommended: a. The relationship has no documented purpose and is invisible to downstream tooling. Carry-forward of prior-year findings is a real audit concept (every flagship reopens recurring findings across cycles), so option b is defensible if you want to model that explicitly, but as it stands the row encodes nothing. Both options are destructive (a delete or a verb overwrite), so either needs your sign-off.

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

Recommended: a. Four independent pure-play vendors keep audit as its own market: AuditBoard, Wolters Kluwer TeamMate+, Workiva, and Diligent HighBond each sell a dedicated internal-audit product, which clears the three-independent-pure-play bar for a peer domain comfortably. Only the suite competitors fold it: ServiceNow IRM treats audit as one workflow inside its GRC platform (and Archer does the same). It currently sits under GRC in the catalog, so keeping it peer is the recommended confirmation; pick b only if you specifically want the suite posture where GRC owns audit as a sub-module.

a12:

---

## Optional (will not hold up the build)

q13: Several universal vendor entities are not modeled yet. Should I research and add the ones that hold up? (yes/no)

The Phase 0 surface marks these as Core or Common across the flagship set: audit universe entities, audit-scoped risk assessments, audit programs, engagement workflows, audit evidence and evidence requests, audit samples, audit walkthroughs, internal control narratives, management responses, audit committee meetings, plus the SOX compliance substrate (sox audit trails, segregation-of-duties violations, electronic signature records). Deeper Common candidates: audit time entries, auditee contacts, audit assertions, audit sampling methods, audit questionnaires, QAR assessments (IIA Standard 1300), audit metrics.

Recommended: yes, but additive and after the modules exist. The audit-universe, risk-assessment, audit-program, evidence, samples, walkthroughs, and management-responses entities are Core (3+ flagships) and close the planning-input, evidence, and response gaps the current 8-master footprint is missing. The SOX audit-trail / SoD / e-signature compliance entities load regardless of vendor presence because this is an assurance market. The deeper Common candidates (time entries, assertions, sampling methods, questionnaires, QAR, metrics) each still want a per-entity verification pass before loading.

a13:

---

<!-- agent map, ignore: q1=B2-MOD-SHAPE q2=B2-AUDIT-VS-GRC q3=B2-NOROLE-PAYLOADS q4=B2-B3-NAMING q5=B2-PATTERN-FLAGS.reportapprover q6=B2-PATTERN-FLAGS.workpaperlock q7=B2-PATTERN-FLAGS.findinglock q8=B2-PATTERN-FLAGS.engagementlock q9=B2-BAD-TAGS q10=B2-SELF-LOOP q11=B2-PAIRWISE q12=B2-DOMAIN-PEER q13=B3 | domain_id=16 | phase0=.tmp_deploy/AUDIT-phase0-2026-06-08.md | reversed: none (fresh evidence confirmed all prior recommendations; grounding upgraded from generic to named-vendor) -->
