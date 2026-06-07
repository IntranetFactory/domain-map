# Unified Endpoint Management (UEM): questions waiting for you

## What this domain is
Unified Endpoint Management is the single console for enrolling, configuring, and securing the laptops, phones, and tablets your workforce uses, across Windows, Apple, Android, and ChromeOS. It runs the full device life: zero-touch onboarding, ongoing policy and app delivery, compliance checks, and retirement. UEM is already split into three modules (Device Lifecycle, Configuration and Application Delivery, and Compliance and Posture); the questions below are the remaining judgment calls that finish the build.

---

q1: (answer this first) The Configuration and Application Delivery module currently folds policy configuration and app delivery together, because a reuse-only pass left neither half with enough of its own data to stand alone. If the new device-config entities in the optional question below get added, should this module split back into two (Policy and Configuration, plus Application Delivery), or stay merged?

- a) Split it into Policy and Configuration plus Application Delivery once those new entities land.
- b) Keep it merged as one Configuration and Application Delivery module.
- c) Decide later, after the new entities are vetted.

Recommended: c. The boundary is cheap to change today and the split only pays off once the new config entities actually exist, so decide it together with that research. This is the build-shape call that the module-config questions hang on, so settle it first.

a1:

---

q2: How should the buyer-facing tagline and description be written for the domain and its three modules (Device Lifecycle, Configuration and Application Delivery, Compliance and Posture)?

- a) You supply the exact wording for each row.
- b) I draft it, you edit, and you supply the final wording.
- c) Defer it to a separate marketing pass.

Recommended: b. A draft gives you a fast starting point, but the words only get written once you approve the exact text, since buyer-voice copy is never auto-written.

a2:

---

q3: For the relationship labels (the six device-to-user links, the seven proposed links between UEM entities, and the vendor-synonym aliases on the eight core entities), should I use the prior agreed wording (has assigned, has last seen, has issued to, has created by, has owned by, has uploaded by)?

- a) Confirm the prior labels.
- b) Revise specific labels (tell me which).
- c) Defer until the lifecycle work settles.

Recommended: a. These were already drafted as the continuation labels and read cleanly; confirming them unblocks all the relationship and alias loading at once.

a3:

---

q4: Should an enrolled device be flagged as carrying personal content (the BYOD posture, which turns on the downstream privacy guardrails)? (yes/no)

Recommended: yes. BYOD is the conservative default and most fleets include personal-device or dual-use enrollment.

a4:

---

q5: Should an enrollment token be flagged as one-shot (locked once it is consumed, so it cannot be reused)? (yes/no)

Recommended: yes. A single-use enrollment token is the standard shape; reusable bulk tokens, if you need them, are better modeled as a separate template entity.

a5:

---

q6: Should a compliance policy be flagged as locked once published (so a new version means a new row rather than editing the live one)? (yes/no)

Recommended: yes. A published policy decides which devices pass or fail, so freezing it keeps an honest record of what was enforced.

a6:

---

q7: After pure-play UEM vendors (Intune, Jamf Pro, Workspace ONE / Omnissa, Kandji, Hexnode, MaaS360) are added as primary coverage, what happens to the five existing RMM and PSA platforms (NinjaOne, Kaseya VSA, N-able N-central, ManageEngine Endpoint Central, GoTo Resolve)?

- a) Keep them as partial coverage on UEM (status quo).
- b) Move their primary attribution to the RMM domain and drop the UEM rows.
- c) Hybrid: keep them partial on UEM and also add them as primary under RMM.

Recommended: a. They genuinely offer partial UEM as a feature, so leaving them at partial is accurate; pick (b) or (c) only if you want RMM canonicalized as the home market for those vendors.

a7:

---

q8: Which regulations should be tagged onto UEM?

- a) All four: GDPR, HIPAA, CCPA / CPRA, FedRAMP.
- b) GDPR only (the universal one).
- c) A specific subset (you name which).
- d) Defer to vendor research.

Recommended: b. GDPR applies universally because BYOD devices carry personal data; the others (HIPAA, CCPA / CPRA, FedRAMP) only matter for healthcare or US public-sector deployments, so add them only if those sectors are in scope.

a8:

---

## Optional (will not hold up the build)

q9: Ten extra device-management entities show up across the flagship UEM vendors (device groups, device scripts, device actions and command logs, reusable enrollment profiles, device certificates, per-device user assignments, per-policy assignment results, telemetry streams, remote-assist sessions, and inventory snapshots). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules are settled. Several (device groups, scripts, actions, enrollment profiles, certificates) are near-universal; a few (telemetry, remote sessions, inventory snapshots) overlap with neighboring domains and want a verification pass first. Whether they land also informs the module-split call in q1.

a9:

---

<!-- agent map, ignore: q1=B2-CONFIG-APPS-SPLIT q2=B2-CATALOG-UX q3=B2-VERBS q4=B2-PATTERN-FLAGS.personalcontent q5=B2-PATTERN-FLAGS.tokenlock q6=B2-PATTERN-FLAGS.policylock q7=B2-COVERAGE q8=B2-REGULATIONS q9=B3-DEVICE-GROUPS+B3-DEVICE-SCRIPTS+B3-DEVICE-ACTIONS+B3-ENROLLMENT-PROFILES+B3-DEVICE-CERTIFICATES+B3-DEVICE-USERS+B3-POLICY-ASSIGNMENT-RESULTS+B3-DEVICE-TELEMETRY-STREAMS+B3-DEVICE-REMOTE-SESSIONS+B3-DEVICE-INVENTORY-SNAPSHOTS | domain_id=86 -->
