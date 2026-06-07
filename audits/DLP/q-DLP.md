# Data Loss Prevention (DLP): questions waiting for you

## What this domain is
Stop sensitive data from leaving the organization, and respond when it tries to. DLP defines what counts as sensitive (policies, classifications, exceptions), watches the channels data moves through (email, endpoint, network, cloud), and turns each violation into an incident your security team can triage, quarantine, and close. It is the primary technical control behind regulatory obligations like GDPR, HIPAA, and PCI-DSS.

---

q1: (answer this first) Who owns Data Loss Prevention as a business function?

- a) Single owner: Information Security.
- b) Split: Information Security owns the enforcement and incident-response side, Privacy Office owns the policy and classification side.
- c) Information Security owns it, with Privacy Office and Legal/Records contributing.

Recommended: c. DLP straddles security, privacy, and records management, so a single security owner with privacy and legal as contributors reflects how the work actually spans teams. This choice also drives who gets which roles across the two modules, so it unlocks the role-and-permission work below it.

a1:

---

q2: Lifecycle states: two runtime objects are short-lived (exfiltration attempts) or append-only (the user activity trail). Which should get a full state machine versus being treated as plain config-shaped records?

- a) Exempt both (no state machine for either).
- b) Give the activity log a state machine (open, reviewed, archived) but exempt the exfiltration attempts.
- c) Give both a state machine.

Recommended: a. Exempting both is the leaner default and matches vendors like Microsoft Purview that treat the activity trail as append-only audit. Pick (b) only if you want analysts to work the activity log as a first-class investigable surface (the Cyberhaven model).

a2:

---

q3: Should incidents be flagged as containing personal content, so privacy and retention rules apply to them? (yes/no)

Recommended: yes. Incidents typically reference a user identifier plus a sample of the leaked content, which is personal data.

a3:

---

q4: Should the user activity log be flagged as containing personal content, so privacy and retention rules apply to it? (yes/no)

Recommended: yes. It is a per-user behavior trail and is personal data by nature.

a4:

---

q5: Should a policy freeze once it is approved, so the enforcement points that depend on it have a stable surface? (yes/no)

Recommended: yes. Freezing at approval is the dominant pattern at the major vendors and keeps live enforcement from shifting underneath a running policy.

a5:

---

q6: Should an exception use a single-approver workflow (one named approver signs off rather than a committee)? (yes/no)

Recommended: yes. Single-approver is the dominant exception pattern across the flagship DLP products.

a6:

---

q7: For the three remaining objects that need a person attached, which actor and verb fits each?

- a) Quarantine items: a reviewer reviews them, and a release approver approves their release.
- b) Activity log: it records the behavior of the user being monitored (note this points the opposite way from the usual person-owns-record edge).
- c) Exfiltration attempts: an actor initiates or attempts them.

Recommended: all three as listed. They follow the project's verb-on-the-actor convention, with the activity log deliberately reversed because the log records the user rather than the user owning the log.

a7:

---

q8: Approve the seven remaining process tags on DLP's cross-domain handoffs?

- a) Approve them as proposed (most anchored to "develop and manage IT security, privacy, and data protection" for inbound, and the breach-response process for outbound).
- b) Drop to the more specific child processes where they exist (response-side only).
- c) Pre-vet them with a separate review pass before approving.

Recommended: a. Every inbound handoff triggers DLP policy authoring or refinement, which is exactly what the proposed parent process describes, so the shared anchor is defensible. Promotion to approved is a sign-off step, so it is not applied automatically.

a8:

---

## Optional (will not hold up the build)

q9: Ten extra objects show up as first-class entities across the flagship DLP vendors (sensitive data types, content fingerprints, sensitivity labels, dictionaries, egress channels, breach notifications on the policy side; policy violations, enforcement actions, forensic evidence, alerts on the runtime side). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the current build settles. The policy-side trio (sensitive data types, content fingerprints, sensitivity labels) and the runtime forensic-evidence trail are the strongest signals; the rest want a verification pass first.

a9:

---

q10: Should I add GDPR, HIPAA, and PCI-DSS as mandatory regulations on DLP? (yes/no)

Recommended: yes. DLP is the primary technical control behind all three (GDPR breach notification, HIPAA ePHI egress, PCI cardholder-data egress). Additive and non-blocking.

a10:

---

<!-- agent map, ignore: q1=B2-S4 q2=B2-S3 q3=B2-S2.incidents_pii q4=B2-S2.activitylog_pii q5=B2-S2.policy_submitlock q6=B2-S2.exception_single_approver q7=B2-S6 q8=B2-S5 q9=B3-MISSING-ENTITY-1+B3-MISSING-ENTITY-2+B3-MISSING-ENTITY-3+B3-MISSING-ENTITY-4+B3-MISSING-ENTITY-5+B3-MISSING-ENTITY-6+B3-MISSING-ENTITY-7+B3-MISSING-ENTITY-8+B3-MISSING-ENTITY-9+B3-MISSING-ENTITY-10 q10=B3-REG-GDPR+B3-REG-HIPAA+B3-REG-PCI-DSS | domain_id=139 -->
