# Data Security Posture Management (DSPM): questions waiting for you

## What this domain is
Find where your sensitive data lives across cloud stores, classify it, and fix the access risk before it turns into a breach. DSPM discovers and inventories data stores (buckets, databases, warehouses, SaaS apps), tags what is sensitive, scores the risk from over-permissive access, and drives the triage and remediation of data-exposure incidents. It secures data at rest, which is the complement to DLP enforcing data in motion at egress.

---

q1: (answer this first) DSPM is currently loaded as three modules: Discovery and Classification (data-store inventory, classification, lineage, shadow data), Access and Risk (IAM access policies and risk scoring), and Incident and Remediation (sensitive-data incidents). How should it be split?

- a) Keep the three modules as loaded.
- b) Split Discovery and Classification back into a separate discovery-inventory module and a classification-lineage module (four modules).
- c) Split Incident and Remediation into a separate incidents module and a remediation-playbooks module (four or five modules).

Recommended: a. The loaded three-module shape is coherent (one discovery-and-classification surface, one access-and-risk engine, one incident-and-remediation workflow), and a re-split is cheap now but expensive later. This choice drives the lifecycle states, pattern flags, and per-module back-fill below it, so it unlocks the rest of the build.

a1:

---

q2: For the four cloud-store inventory masters (cloud storage buckets, cloud databases, data warehouses, SaaS app instances), should I author a three-state lifecycle (discovered, inventoried, decommissioned) on each, or apply the static-shape exemption (no lifecycle rows, just a status field)?

- a) Author the three-state lifecycle on all four.
- b) Apply the static-shape exemption to all four (surface the exemption in the audit log).
- c) Mixed (specify which masters get a lifecycle).

Recommended: b. These are inventory records with no user-workflow gates, so a status field is more honest than full lifecycle rows. Choosing the exemption needs your explicit acceptance because the audit checks for it.

a2:

---

q3: Outbound handoff 285 (DSPM to Data Governance, on the "data asset classified" event) points the wrong way: that event is owned on the Data Governance side, and an existing inbound handoff already wires the correct direction, so 285 looks like a duplicate-but-reversed insert. How should it be handled?

- a) Delete handoff 285 as a duplicate (this also drops its attached process tag).
- b) Keep it but repoint it to a new DSPM-owned event ("data asset contributed classification") that models DSPM enriching a Data-Governance-owned asset with its sensitivity tag.

Recommended: a. The canonical direction is already wired by the inbound handoff, so the reversed copy is most likely a stray insert. This deletes a row (and its process tag), so it needs your sign-off.

a3:

---

q4: Outbound handoff 288 (DSPM to Privacy Management) fires on an event owned by data classifications but carries data assets as its payload, which is incoherent. How should the mismatch be fixed?

- a) Repoint the payload to data classifications, to match the event's owner.
- b) Insert a new DSPM-owned event ("data asset sensitivity reclassified by DSPM") and repoint the handoff to it.
- c) Delete handoff 288 (the DSPM to Privacy signal is already covered by the security-operations handoffs).

Recommended: a. Aligning the payload with the event's owner is the lightest fix that keeps the signal. Any of these overwrites or deletes a live row, so it needs your call.

a4:

---

q5: Should sensitive-data incidents be flagged as containing personal content, so they fall under personal-data handling (incidents reference PII exposures, signer identities, and owner emails)? (yes/no)

Recommended: yes. Incidents plainly carry personal data, so the flag should reflect that.

a5:

---

q6: Should IAM access policies carry a submit-lock, so a remediation review freezes the policy from further edits until a human accepts the change? (yes/no)

Recommended: yes. Locking a policy under remediation review prevents silent edits mid-review.

a6:

---

q7: Should shadow-data findings be flagged as containing personal content, since a finding is often itself a discovery of unmanaged PII? (yes/no)

Recommended: yes. Shadow-data findings frequently are PII discoveries, so the flag fits.

a7:

---

q8: Should IAM access policies carry a single-approver flag, so a one-off "accept the risk" decision can be signed off by one security-team approver? (yes/no)

Recommended: yes. One-off risk-acceptance is a single-approver decision in practice.

a8:

---

q9: Which business function should own DSPM?

- a) Information Security.
- b) IT Risk Management.
- c) Privacy and Data Protection.
- d) Multiple owners (specify the combination).

Recommended: a. Information Security is the most natural home for a data-security-posture capability, though your org's business-function taxonomy may place it under risk or privacy instead.

a9:

---

q10: Which compliance regulations should DSPM declare, and at what applicability (mandatory, recommended, or optional)?

- a) All five: GDPR (Articles 30, 32, 35), CCPA/CPRA, HIPAA Security Rule, PCI-DSS 4.0, and US state breach-notification laws.
- b) GDPR and CCPA/CPRA only (the privacy core).
- c) A subset you name (per-regulation yes/no plus applicability).

Recommended: a, each scoped to your data footprint (GDPR for EU data subjects, CCPA/CPRA for California consumers, HIPAA for US PHI, PCI-DSS for cardholder data, breach-notification for US-resident sensitive data). All five are backed by the flagship DSPM vendors; mark each mandatory only where the matching data footprint exists.

a10:

---

q12: Identity Governance and Administration forwards iam access policy to Data Security Posture Management to manage IT user identity and authorization, but Data Security Posture Management does not yet have anyone assigned to manage IT user identity and authorization, so this step has no owner. How should it be handled?
- a) Record it now as work Data Security Posture Management owns, and assign a named owner once Data Security Posture Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Data Security Posture Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

q13: Security Operations forwards sensitive data incident to Data Security Posture Management to analyze IT security threat impact, but Data Security Posture Management does not yet have anyone assigned to analyze IT security threat impact, so this step has no owner. How should it be handled?
- a) Record it now as work Data Security Posture Management owns, and assign a named owner once Data Security Posture Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Data Security Posture Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Handoff 290 (DSPM to Security Operations, on the "sensitive data incident resolved" event) is currently tagged with a broad parent process, "Control IT risk, compliance, and security". A more specific child process, "Analyze IT security threat impact" (the same one the related detection handoff 287 already uses), describes the incident-resolution work more precisely. Should I re-point 290's process tag to the more specific child? (yes/no)

Recommended: yes. Matching the grain of sibling handoff 287 keeps the two incident handoffs consistent. This overwrites an existing process tag, so it needs your sign-off.

a14:

---

## Optional (will not hold up the build)

q11: Flagship DSPM vendors surface four extra first-class masters beyond what is modeled today: data access paths (identity to role to permission to resource, surfaced by Cyera, Wiz, Sentra), remediation playbooks (parameterized fix recipes, surfaced by Cyera, Securiti, Wiz), toxic combinations (multi-factor risk patterns like PII plus public exposure plus over-permissive IAM, surfaced by Wiz), and data perimeters (the union of stores under a single policy or regulation, surfaced by BigID, Securiti, Concentric AI). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the module shape is confirmed. Each wants a verification pass before loading.

a11:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT-NOTE q2=B2-S2 q3=B2-S3 q4=B2-S4 q5=B2-S5.incidentpii q6=B2-S5.policysubmitlock q7=B2-S5.shadowpii q8=B2-S5.policysingleapprover q9=B2-S6 q10=B2-S7 q11=B3-DATA-ACCESS-PATHS+B3-REMEDIATION-PLAYBOOKS+B3-TOXIC-COMBINATIONS+B3-DATA-PERIMETERS q12=B2-B9D-OWN-273 q13=B2-B9D-OWN-1164 q14=B2-B9D-RETAG-290 | domain_id=140 -->
