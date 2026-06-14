# Robotic Process Automation (RPA): questions waiting for you

## What this domain is

Build, run, and govern software robots that automate repetitive, rule-based work across your business systems.

Author bots from reusable activities, package and approve them for release, then schedule and orchestrate their runs at scale. Watch every execution, capture exceptions, keep a full activity trail, and manage the credentials the bots use to act inside the systems they touch. The goal is to take routine clicks and keystrokes off people's plates while keeping a controlled, auditable record of what each bot did.

---

q1: (answer this first) How should Robotic Process Automation be split into modules (the sub-areas of the product)?

- a) Three modules: Bot Authoring (designing bots, their activities, and deployment packages); Orchestration (live runs, schedules, and activity logs); Bot Identity (the credential vault the bots use), kept as its own surface.
- b) Two modules: same as (a) but fold the credential vault into Orchestration as a fourth data set.
- c) Defer the call until a vendor-research pass compares how the major platforms package these areas.

Recommended: a. UiPath separates its credential store (Assets) into a surface distinct from the Orchestrator, which is exactly the dedicated Bot Identity module in (a); Automation Anywhere instead keeps credentials inside the Control Room, which is the folded (b) shape. The UiPath-style split matches security-conscious deployments; folding (b) is also valid if you want it leaner.

a1:

---

q2: An "audit trail" synonym was proposed for the bot activity log, but that term already belongs to the Audit domain. How should it be handled?

- a) Drop "audit trail"; keep only the clean synonyms already loaded (execution log, bot trace).
- b) Add "audit trail" but tag it as an industry synonym, distinct from the Audit domain's canonical term.
- c) Document the overlap only; load no extra synonym.

Recommended: a. The clean synonyms are already in place and avoid the collision; accept that the Audit domain consumes the RPA log rather than re-using its name.

a2:

---

q3: Should bot credentials be flagged as holding personal data, since a bot impersonating a named user makes its stored secrets PII-adjacent? (yes/no)

Recommended: yes. Credential content is secret-shaped and personal-data-adjacent in user-impersonation scenarios.

a3:

---

q4: Should a released deployment package be frozen, so the promotion chain has an immutable artifact? (yes/no)

Recommended: yes. Locking a released package keeps the promotion chain trustworthy and reproducible.

a4:

---

q5: Should each bot require a single named approver before it can be deployed? (yes/no)

Recommended: yes. Most platforms model one accountable technical owner who signs off on a bot's deployment.

a5:

---

q6: The deeper market-surface candidates below (extra entities, sibling domains, regulations, a starter kit) are agent guesses with no vendor-research anchor yet. How should they be vetted?

- a) Run a vendor-research pass across the major RPA platforms and re-check each candidate against their real product surface.
- b) You name which candidates ring true and treat those as confirmed, skipping the research pass.
- c) Defer all of them until the modules in q1 exist.

Recommended: a. The candidates are unanchored agent knowledge, so a vendor-surface check before loading any of them is the safest route.

a6:

---

## Optional (will not hold up the build)

q7: Six extra entities show up across the flagship RPA platforms (work queues, individual queue items, shared bot assets, leaf-level actions, the unattended-bot host registry, and multi-tenant or folder organization). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist, and only after the vetting route in q6.

a7:

---

q8: Four adjacent automation markets are missing from the catalog (AI-augmented process automation, task mining, process orchestration or BPMN engines, and secrets management). Should I research them as candidate sibling domains, each of which would carry handoffs into or out of RPA? (yes/no)

Recommended: yes, as new sibling domains rather than RPA modules; additive and non-blocking.

a8:

---

q9: RPA has no compliance frameworks tagged today, though bots that touch regulated systems inherit those systems' regimes (SOX, HIPAA, PCI-DSS, GxP / 21 CFR Part 11, GDPR). Should these be recorded on the RPA domain as a buyer-side compliance signal? (yes/no)

Recommended: yes. There is no RPA-specific regulator, but the inherited compliance posture is a real signal for buyers.

a9:

---

q10: Should I add a lightweight starter kit (an attended-bot path for small-business scenarios where the full orchestrator is overkill)? (yes/no)

Recommended: yes, but only after the full modules land; the starter is a packaging choice, not a structural gate.

a10:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3.personalcontent q4=B2-S3.submitlock q5=B2-S3.singleapprover q6=B2-S4 q7=B3-S1 q8=B3-S2 q9=B3-S3 q10=B3-S4 | domain_id=38 -->
