# Marketing Automation (MA): questions waiting for you

## What this domain is
Orchestrate marketing emails, nurture journeys, and lead-scoring across email, SMS, push, and the web.

Author and send marketing campaigns, build multi-step nurture journeys that move people forward automatically, and score leads so sales hears about the warm ones first. Capture interest through landing-page forms, run A/B tests to find the version that converts, and keep the whole program consent-aware so emails honor each subscriber's preferences and the regulations that apply.

---

q1: (answer this first) One inbound handoff is tagged to the wrong kind of process. A customer-data-platform segment being activated into Marketing Automation is currently tagged to a customer-loyalty-program process, which looks mismatched. How should it be tagged?

- a) Keep the existing loyalty-program tag as-is.
- b) Retarget it to "Develop and manage marketing plans" (this deletes the existing tag and adds the new one).
- c) Add "Develop and manage marketing plans" as a second tag, leaving the existing one in place.

Recommended: b. A segment-activation handoff into marketing maps to marketing planning, not loyalty. Replacing an existing tag is destructive, so it needs your call; if you'd rather not delete anything, c is the safe additive alternative.

a1:

---

q2: This review authored the rest of the domain's missing structure and it is all sitting at "new" for you to review in the records (nothing was auto-approved). It covers: the five objects' lifecycle state machines, the relationships between them and to users, vendor-terminology aliases, the personal-data / send-lock flags, and two marketing personas. Approve it as a batch once it reads right, or flag anything to change? (yes/no)

- One editorial change worth flagging: a marketing email's lifecycle was set to draft to scheduled to sent. "Unsubscribed" was left off as an email state (it is a subscriber action, already captured by the unsubscribe event), but say the word and I will add it back.

Recommended: yes. The wording follows how the flagship marketing platforms model each object; review in the catalog UI and approve, or tell me which specific row to reword.

a2:

---

q7: Sales Engagement hands lead-score work to Marketing Automation, but no one in Marketing Automation is assigned to manage leads and opportunities, so that step has nobody responsible for it today. Who should own it?
- a) The Marketing Operations Manager runs it and approves it.
- b) Someone else you name runs and approves it.
- c) Leave it unassigned for now.

Recommended: a. The Marketing Operations Manager is the only Marketing Automation persona that reaches the lead-scoring module where this work lands, so it is the natural owner and gives the step a named owner.

a7:

---

q8: Social Media Management hands campaign work to Marketing Automation, but no one in Marketing Automation is assigned to execute promotional activities, so that step has nobody responsible for it today. Who should own it?
- a) The Campaign Manager runs it and approves it.
- b) Someone else you name runs and approves it.
- c) Leave it unassigned for now.

Recommended: a. The Campaign Manager owns campaign execution in the campaign-authoring module where this promotional work lands, so it is the natural owner and gives the step a named owner.

a8:

---

q9: Five handoffs that Marketing Automation publishes are tagged with a broad process when a more specific one for the same record already exists. Lining them up with the finer process means deleting/overwriting the existing broad tag, so it needs your call. Apply the cleanup?
- a) Apply all five re-points.
- b) Apply only the ones I name (say which).
- c) Leave the broad tags as they are.

Recommended: a. Each broad tag has a finer counterpart already on the same handoff or realized on the receiving side; re-pointing makes the handoff describe the actual work. It overwrites an existing tag, which is why it is your call rather than applied automatically.

a9:

---

## Optional (will not hold up the build)

The domain is structurally and semantically complete (4 modules, all masters classified with lifecycle, relationships, aliases, personas, tools, and a system skill). The items below are additive ideas, not gaps.

q3: Six extra objects show up across the flagship marketing platforms (per-send email instances, authored audience lists, subscriber preferences, A/B test variants, per-send email metrics, and per-step journey events). Should I research (Phase 0 vendor check) and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after a verification pass. Several are common across the vendor set.

a3:

---

q4: Should there be a fifth module for compliance and consent (consent records, double opt-in, preference center, suppression/unsubscribe lists), instead of leaving that surface spread across forms and the regulation tags? Note: a new module is a structural decision, so if you want it I will run a Phase 0 vendor check first to confirm flagship platforms treat consent as a module-sized surface. (yes/no)

Recommended: lean yes, pending that Phase 0 check. Additive and non-blocking; the domain already meets the module floor without it.

a4:

---

q5: Three adjacent markets could become their own domains: SMS marketing, transactional email, and reverse-ETL. Should I scope and add the ones that hold up as standalone domains? (yes/no)

Recommended: yes, but each needs a scoping check first (SMS and transactional email have different buyers and compliance shapes; reverse-ETL was already queued elsewhere). Non-blocking.

a5:

---

q6: Should I add more privacy and anti-spam regulations beyond the current seven, for a future review (CASL, PIPEDA, LGPD, Australia's Spam Act, the ePrivacy Directive)? (yes/no)

Recommended: yes, as a later low-stakes pass. Does not block the build.

a6:

---

<!-- agent map, ignore: q1=B2-H1-78-FOLLOWUP q2=record_status_approval(Rule#1, all 2026-06-08 writes + 06-06 catalog copy) q3=B3-MARKETING-EMAIL-SENDS+B3-AUDIENCE-LISTS+B3-SUBSCRIBER-PREFERENCES+B3-AB-TEST-VARIANTS+B3-EMAIL-SEND-METRICS+B3-JOURNEY-STEP-EVENTS q4=B3-MA-COMPLIANCE-MODULE q5=B3-SMS-MARKETING-DOMAIN+B3-TRANSACT-EMAIL-DOMAIN+B3-REVERSE-ETL-DOMAIN q6=B3-REGULATION-CASL-LGPD-PIPEDA q7=B2-B9D-OWN-147 q8=B2-B9D-OWN-665 q9=B2-B9D-RETAG-MA-SOURCE | domain_id=70 -->
