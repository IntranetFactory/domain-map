# Marketing Automation (MA): questions waiting for you

## What this domain is
Orchestrate marketing emails, nurture journeys, and lead-scoring across email, SMS, push, and the web.

Author and send marketing campaigns, build multi-step nurture journeys that move people forward automatically, and score leads so sales hears about the warm ones first. Capture interest through landing-page forms, run A/B tests to find the version that converts, and keep the whole program consent-aware so emails honor each subscriber's preferences and the regulations that apply.

---

q1: (answer this first) Are these the right lifecycle state machines for the five marketing objects?

- a) Approve as proposed: campaigns draft to active to completed; emails draft to scheduled to sent to unsubscribed; nurture journeys draft to active to paused to completed; forms draft to published to archived; lead scores scored to recomputed (a signal loop).
- b) Rewrite specific state names, verbs, or which transitions need a permission (specify per object).

Recommended: a. The proposed states match how the flagship marketing platforms model each object, and they define the workflow shape every other decision below sits on top of, so settling them unblocks the rest.

a1:

---

q2: Are these the right relationship verbs linking the five objects to each other?

- a) Approve as proposed: a campaign has many emails; a nurture journey has many emails (as its steps); a form feeds lead scores; a nurture journey is triggered by lead scores (score-threshold enrollment); a campaign has many nurture journeys.
- b) Rewrite specific verbs (specify per edge).
- c) Drop specific edges (specify).

Recommended: a. These are the standard market-practice edges between marketing objects; the wording is editorial and yours to set.

a2:

---

q3: Are these the right verbs for how people (users) relate to each object?

- a) Approve as proposed: a user authors emails, owns campaigns, owns nurture journeys, owns forms, and configures lead scores.
- b) Rewrite specific verbs (specify per edge).

Recommended: a. These are catalog-conventional actor verbs, but you may prefer alternative phrasing per role.

a3:

---

q4: Should I add vendor-terminology aliases to the five objects (the names other platforms use, such as Journey, Flow, Workflow, Sequence for nurture journeys)?

- a) Approve the candidate aliases drawn from the major marketing platforms; you specify the exact wording per object.
- b) Skip for now and revisit later.

Recommended: a. Aliases make the catalog searchable under the names buyers actually use, but each alias is editorial wording you sign off per row.

a4:

---

q5: The buyer-voice catalog copy (tagline and description) on the four Marketing Automation modules and the domain itself was written into previously empty fields and is awaiting your review. Approve as written, or request a rewrite?

- a) Approve as written.
- b) Rewrite a specific surface (specify the exact text and which module or the domain).

Recommended: a. The copy was written straight into empty fields and carries the review signal in-record; approve it once it reads right to you, since overwriting it later needs your explicit sign-off.

a5:

---

q6: An inbound handoff from the customer-data platform (a segment getting activated into Marketing Automation) is tagged to a customer-loyalty process, which looks mismatched. How should it be tagged?

- a) Keep the existing loyalty-program tag as-is.
- b) Retarget it to "Develop and manage marketing plans" (replaces the existing tag).
- c) Add "Develop and manage marketing plans" as a second tag alongside the existing one.

Recommended: b. A segment-activation handoff into marketing maps more cleanly to marketing planning than to loyalty, but replacing an existing tag is destructive, so it needs your call.

a6:

---

q7: Should a marketing email lock once its send job is scheduled, so the content cannot be quietly changed after scheduling? (yes/no)

Recommended: yes. This matches the send-lock pattern in the flagship platforms and keeps the sent record honest.

a7:

---

q8: Should a marketing campaign lock once it is active, so its definition cannot be edited mid-flight? (yes/no)

Recommended: yes. The flagship platforms lock an active campaign for the same auditability reason.

a8:

---

q9: Should a nurture journey lock once it is activated, so changing it means publishing a new version rather than editing the live one? (yes/no)

Recommended: yes. Activation freezing the definition is the standard journey pattern and keeps live enrollments stable.

a9:

---

q10: Should marketing forms be treated as collecting personal data (they capture contact details directly)? (yes/no)

Recommended: yes. Forms collect PII at the point of capture, so they fall under retention and privacy handling.

a10:

---

q11: Should lead scores stay classified as derived (not personal) data, since they are computed rather than collected? (yes/no)

Recommended: yes. A score is a derived value, not directly captured personal data.

a11:

---

## Optional (will not hold up the build)

q12: Six extra objects show up across the flagship marketing platforms (per-send email instances, authored audience lists, subscriber preferences, A/B test variants, per-send email metrics, and per-step journey events). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Several are common across the vendor set, though each still wants a verification pass first.

a12:

---

q13: Should I add a fifth module for compliance and consent (consent records, double opt-in, preference center, suppression and unsubscribe lists), instead of leaving that surface spread across forms and the regulation tags? (yes/no)

Recommended: yes in principle, pending a check that the flagship platforms treat consent as a distinct module-sized surface rather than fields on existing objects. Additive and non-blocking.

a13:

---

q14: Three adjacent markets could become their own domains: SMS marketing, transactional email, and reverse-ETL. Should I research and add the ones that hold up as standalone domains? (yes/no)

Recommended: yes, but each needs a scoping check first (SMS and transactional email have different buyers and compliance shapes than marketing orchestration, and reverse-ETL was already queued elsewhere). Additive and non-blocking.

a14:

---

q15: Should I add more privacy and anti-spam regulations beyond the current seven, for a future review (CASL, PIPEDA, LGPD, Australia's Spam Act, the ePrivacy Directive)? (yes/no)

Recommended: yes, as a later review pass. Low stakes and additive; it does not block the build.

a15:

---

<!-- agent map, ignore: q1=B2-B12 q2=B2-B6 q3=B2-B7-VERBS q4=B2-B11 q5=B2-A4-REVIEW q6=B2-H1-78-FOLLOWUP q7=B2-B4.email q8=B2-B4.campaigns q9=B2-B4.journeys q10=B2-B4.forms q11=B2-B4.leadscores q12=B3-MARKETING-EMAIL-SENDS+B3-AUDIENCE-LISTS+B3-SUBSCRIBER-PREFERENCES+B3-AB-TEST-VARIANTS+B3-EMAIL-SEND-METRICS+B3-JOURNEY-STEP-EVENTS q13=B3-MA-COMPLIANCE-MODULE q14=B3-SMS-MARKETING-DOMAIN+B3-TRANSACT-EMAIL-DOMAIN+B3-REVERSE-ETL-DOMAIN q15=B3-REGULATION-CASL-LGPD-PIPEDA | domain_id=70 -->
