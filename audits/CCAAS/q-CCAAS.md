# Contact Center as a Service (CCAAS): questions waiting for you

## What this domain is
The cloud platform that runs your contact center: telephony, omnichannel routing, IVR, and workforce engagement (recording, quality management, workforce management), plus AI agent assist.

It is the engine, not the case-management app. Calls and chats come in, the routing engine and IVR decide who handles them, interactions are captured and recorded, and the workforce engagement layer scores quality and coaches agents. This is distinct from CSM, which is the case-management business app sitting on top.

---

q1: (answer this first) How should Contact Center as a Service be split into modules (the sub-areas of the product)?

- a) Four modules: CCAAS-ROUTING-ENGINE (ACD, IVR, queues, agent states), CCAAS-INTERACTION-CAPTURE (recordings, sessions, dispositions), CCAAS-WORKFORCE-ENGAGEMENT (QM, speech analytics, coaching), CCAAS-DIALER (outbound campaigns, TCPA consent, predictive/preview/progressive dialing).
- b) Two modules: CCAAS-CORE plus CCAAS-WEM.
- c) Three modules: same as (a) but collapse Dialer into Routing.
- d) Five modules: same as (a) but split Speech Analytics out of Workforce Engagement.

Recommended: a. The four-module split is the 2026-05-30 audit recommendation and maps cleanly to how the flagship CCaaS platforms present the product. This choice drives capability authoring, master routing, skill re-derivation, and lifecycle module FKs, so it unlocks the rest of the build.

a1:

---

q2: Should the Workforce Engagement piece stay a CCAAS sub-module, or be promoted to its own standalone domain?

- a) Keep it as a CCAAS sub-module (CCAAS-WORKFORCE-ENGAGEMENT).
- b) Promote it to a standalone domain (CCAAS-WEM is already queued in _missing-domains.md).

Recommended: a for now, but b is defensible. Verint, Calabrio, NICE WEM, and Genesys WEM are arguably point-solution vendors in their own right; promoting WEM drops the CCAAS module count by one and frees a cleaner vendor surface. This decision also affects the module shape in q1.

a2:

---

q3: How should Conversation Intelligence (Gong, Chorus, Refract) be positioned relative to CCAAS recordings?

- a) Downstream consumer of CCAAS recordings (CCAAS publishes to it).
- b) A separate vendor surface that overlaps the CCAAS quality-management leg.
- c) A feature of SALES-ENG, where call_recordings (id 122) currently lives.

Recommended: a or b pending a vendor check. This affects whether call_recordings (id 122) moves out of SALES-ENG and whether ccaas_call_recordings (id 735) absorbs it.

a3:

---

q4: Should the two call-recording masters be kept separate or merged?

- a) Keep both call_recordings (id 122, SALES-ENG, rep recordings) and ccaas_call_recordings (id 735, CCAAS, contact-center recordings), with the split documented.
- b) Merge them under a single canonical bare-word claim.

Recommended: a. The audit recommends keep-both: lifecycle, regulation, retention, and redaction profiles differ between rep-call recordings and contact-center recordings.

a4:

---

q5: On handoffs 501 and 530, should CRM-ACCT-MGT (module 46) consume contact_records (id 257), or switch to crm_contacts (id 98)?

- a) Keep contact_records (id 257).
- b) Switch to crm_contacts (id 98).

Recommended: b warrants a check. This is a boundary call: the CRM team would more naturally read "Contact" as crm_contacts, and the current consumer may be a leftover from the pre-modular era. Confirm whether CRM consumes id 257 for a real reason.

a5:

---

q6: For the five collision-prone CCAAS masters (support_sessions, contact_records, queue_statistics, agent_states, disposition_codes), how should each be named under Rule #9?

- a) Prefix all to ccaas_<name> (default).
- b) Claim a canonical bare-word per row, with rationale.
- c) Mixed: prefix some, claim canonical for others.

Recommended: a. The bare-word names collide with potential CSM / CRM / WFM / CONV-AI / ATS entities, and renaming after Phase B is far more invasive.

a6:

---

q7: Who should publish the intent.identified event (handoff 530)?

- a) Reassign to CONV-AI: DELETE handoff 530 and let CONV-AI author the equivalent outbound.
- b) Keep it on CCAAS: PATCH trigger_event 200 to data_object_id 257.

Recommended: a. The event is keyed on intent_detections (a CONV-AI master), so it is mis-attributed; the audit recommends re-sourcing it to CONV-AI. This is a destructive change (DELETE or trigger-event overwrite), so it needs your sign-off.

a7:

---

q8: Should the duplicate APQC tag on handoff 722 be deleted? DELETE handoff_processes id 238 (PCF 21679 "Deliver approved content"), keeping id 753 (PCF 20898 "Maintain service support knowledge repository")? (yes/no)

Recommended: yes. Handoff 722 carries two agent_curated tags; the audit confirmed PCF 20898 as the correct mapping and 21679 as the stale duplicate. DELETE is destructive, so it needs your confirmation.

a8:

---

q9: Handoff 743 (CONV-AI to CCAAS, conversation_flow.fallback_triggered) was originally deferred-to-Discover, then auto-tagged with handoff_processes id 810 (PCF 10395). Keep that tag, or DELETE it and let Discover Pass 3 author a custom process?

- a) Keep id 810.
- b) DELETE id 810.

Recommended: b. Fallback engineering had no clean PCF cross-industry match in the original audit, and the later auto-tag is generic and conflicts with that judgment. DELETE is destructive, so it needs your sign-off.

a9:

---

q10: Handoff 746 (CONV-AI to CCAAS, bot_definition.published) was originally deferred-to-Discover, then auto-tagged with handoff_processes id 812 (PCF 20824). Keep that tag, or DELETE it and let Discover Pass 3 author a custom process?

- a) Keep id 812.
- b) DELETE id 812.

Recommended: b. Bot-runtime publication is build-side and outside PCF cross-industry; the original judgment to leave it for a custom process likely still holds. DELETE is destructive, so it needs your sign-off.

a10:

---

q11: The CCAAS domains row has a destructive text cleanup pending. Should I rewrite business_logic to swap the U+2014 em-dash for a colon, and rewrite description to change British "centres" to American "centers"? (yes/no)

Recommended: yes. The em-dash violates the project-wide ban and "centres" violates the American-English rule. Both columns are non-empty, so the rewrite is a destructive overwrite that needs your sign-off.

a11:

---

## Optional (will not hold up the build)

q12: Should I research and add agent_skill_assignments (a junction of users x agent_skills, universal across Genesys, NICE, Five9, Talkdesk, Amazon Connect) to CCAAS-ROUTING-ENGINE? (yes/no)

Recommended: yes, but additive and can happen after the modules exist.

a12:

---

q13: Should I research and add wrap_up_reasons (after-call work classification distinct from disposition_codes, present in 4 of 5 flagship vendors) to CCAAS-INTERACTION-CAPTURE? (yes/no)

Recommended: yes, but additive and non-blocking.

a13:

---

q14: Should I research and add agent_scorecards (rolled-up QM aggregate per agent per period, from Verint / Calabrio / NICE WEM) to CCAAS-WORKFORCE-ENGAGEMENT? (yes/no)

Recommended: yes, but additive and non-blocking.

a14:

---

q15: Should I research and add speech_analytics_categories (configurable keyword and phrase categorization from Verint / NICE WEM) to CCAAS-WORKFORCE-ENGAGEMENT? (yes/no)

Recommended: yes, but additive and non-blocking.

a15:

---

q16: Should I research and add outbound_campaigns (dialer campaign definitions: predictive / preview / progressive, from Five9 / NICE / Genesys) to CCAAS-DIALER? (yes/no)

Recommended: yes, but additive and non-blocking; central to the dialer module if the four-module shape is adopted.

a16:

---

q17: Should I research and add callback_requests (customer-initiated "call me back" with a scheduled slot, universal across CCaaS vendors) to CCAAS-ROUTING-ENGINE? (yes/no)

Recommended: yes, but additive and non-blocking.

a17:

---

q18: Should I research and add ivr_languages (localized prompt sets per supported language, from Genesys / NICE) to CCAAS-ROUTING-ENGINE? (yes/no)

Recommended: yes, but additive and non-blocking; it is borderline config-versus-entity, so it wants a verification pass.

a18:

---

<!-- agent map, ignore: q1=B2-MODULE-SHAPE q2=B2-WEM-SCOPE q3=B2-CONV-INTEL-RELATIONSHIP q4=B2-CALL-RECORDINGS-SPLIT q5=B2-CONTACT-RECORDS-CRM-CONSUMER q6=B2-NAMING-ARBITRATION q7=B2-INTENT-IDENTIFIED-OWNERSHIP q8=B2-H722-DEDUPE-DELETE q9=B2-H743-746-RETAG.h743 q10=B2-H743-746-RETAG.h746 q11=B1A-DESC-EMDASH q12=B3-AGENT-SKILL-ASSIGNMENTS q13=B3-WRAP-UP-REASONS q14=B3-AGENT-SCORECARDS q15=B3-SPEECH-ANALYTICS-CATEGORIES q16=B3-OUTBOUND-CAMPAIGNS q17=B3-CALLBACK-REQUESTS q18=B3-IVR-LANGUAGES | domain_id=98 -->
