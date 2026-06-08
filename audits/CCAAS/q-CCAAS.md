# Contact Center as a Service (CCAAS): questions waiting for you

## What this domain is
The cloud platform that runs your contact center: telephony, omnichannel routing, IVR, and workforce engagement (recording, quality management, workforce management), plus AI agent assist.

It is the engine, not the case-management app. Calls and chats come in, the routing engine and IVR decide who handles them, interactions are captured and recorded, and the workforce engagement layer scores quality and coaches agents. This is distinct from CSM, which is the case-management business app sitting on top.

---

q1: (answer this first) How should CCaaS be split into modules? The build adopted a 3-module split: Routing and Queues (queue_statistics, disposition_codes), Agent Desktop and Interactions (support_sessions, contact_records, agent_states), and Quality and Analytics (call recordings, interaction evaluations, evaluation forms).

- a) Three modules: Routing and Queues + Agent Desktop and Interactions + Quality and Analytics.
- b) Four modules: also split out a Dialer/Outbound module (or split IVR/Self-Service out of Routing).
- c) Two modules: fold Routing and Queues into the Agent Desktop module, keep Quality and Analytics separate.

Recommended: a. Genesys Cloud CX, NICE CXone, Five9, Amazon Connect, and Talkdesk all package CCaaS as the same three surfaces: a routing/ACD-and-flow engine, a live agent workspace, and a post-interaction quality/analytics tier, so (a) is how the market is actually sold. The genuine judgment call is outbound: Five9 leads with its outbound dialer as a distinct product line and Genesys and NICE sell outbound campaign management as a named add-on, so a 4th Dialer module (option b) is defensible if outbound dialing is in scope for you (this is also the home of the outbound_campaigns idea in the Optional section). Genesys (Architect) and NICE (Studio) likewise expose IVR/flow design as its own admin surface, so splitting IVR out is the other shape of (b). Avoid (c): every flagship keeps routing/ACD separate from the agent desktop, so folding them under-splits the domain.

a1:

---

q2: Should workforce engagement (the recording, quality-management, and adherence surface) stay inside CCaaS, or be promoted to its own domain?

- a) Keep it inside CCaaS (the Quality and Analytics module plus agent-state adherence).
- b) Promote workforce engagement to a standalone WEM domain.

Recommended: a, with an honest caveat. Genesys Cloud CX and NICE CXone both bundle workforce engagement (recording, QM, WFM, coaching) inside the suite as a licensed tier, so keeping it in CCaaS matches how the platform vendors package it. The real counter-argument is that Verint and Calabrio sell workforce engagement as a standalone platform that overlays any ACD, and NICE markets its own WEM as a separable product line, so WEM is a genuine point-solution market. Take (b) if you want to model that market faithfully and free the Verint/Calabrio vendor surface to its own domain; the trade-off is that it moves the call-recording, evaluation, and form masters out of CCaaS and duplicates the agent-state adherence link across two domains.

a2:

---

q3: The five bare-word CCaaS masters (support_sessions, contact_records, queue_statistics, agent_states, disposition_codes) have unprefixed names that can collide with CSM, CRM, WFM, CONV-AI, or ATS entities. How should they be named? (This renames live tables, so it needs your sign-off.)

- a) Prefix every one to ccaas_* (the safe default).
- b) Claim the canonical bare-word per row where CCaaS genuinely owns the concept.
- c) A mix: prefix the collision-prone ones, claim canonical for the rest.

Recommended: a. Genesys, NICE, Five9, Amazon Connect, and Talkdesk all treat "contact"/"interaction", "queue", "agent state", and "disposition code" as contact-center-scoped concepts rather than catalog-universal ones, so the ccaas_ prefix keeps them unambiguous against the CRM "contact", the WFM "agent", and the CSM "case". Renaming after the build is invasive (it cascades through the junctions, relationships, trigger events, and handoffs), which is exactly why it is surfaced rather than auto-applied. (ccaas_call_recordings is already correctly prefixed.)

a3:

---

q4: The domain's business_logic field contains a banned em-dash and the description uses the British spelling "centres". Apply the minimal fixes (em-dash to a colon, "centres" to "centers")? (yes/no)

Recommended: yes. CLAUDE.md forbids em-dashes everywhere and mandates American English. Proposed rewrites: business_logic to "ACD/routing engine, IVR runtime, real-time analytics, and workforce engagement (recording, QM, WFM): the platform IS the engine." and description to "...AI agent assist for contact centers. Distinct from CSM (case-management business app)." Both fields are non-empty, so the overwrite needs your confirmation.

a4:

---

q5: One outbound handoff (530, "intent identified", CCaaS to CRM) is mis-attributed: its payload is contact_records but its trigger event references intent_detections, which CONV-AI owns. How should it be fixed? (This is a destructive change, so it needs your sign-off.)

- a) Delete handoff 530 and let CONV-AI author the equivalent outbound.
- b) Keep it and re-point the trigger event to contact_records, if CCaaS genuinely publishes "intent identified".

Recommended: a. Intent detection is a conversational-AI concept: Genesys, NICE, Five9, Amazon Connect, and Talkdesk all consume detected intent from a bot/NLU layer rather than publishing it from the routing engine, so the cleaner model is to let CONV-AI own the outbound. Take (b) only if your CCaaS routing genuinely classifies and publishes intent itself. Either path is destructive (delete a handoff or overwrite a trigger event), so it needs your call.

a5:

---

q6: Two CCaaS-to-CRM handoffs (501 "contact record captured" and 530 "intent identified") hand the raw contact_records master to CRM. Should CRM instead consume crm_contacts, the record it actually masters?

- a) Keep contact_records as the consumed payload.
- b) Switch the consumed payload to crm_contacts.

Recommended: b. Across the vendor set the CTI/CRM connector (Genesys for Salesforce, NICE CXone Agent for Salesforce, the Amazon Connect CTI adapter, Talkdesk for Salesforce) pops and updates the CRM Contact/Account record on screen-pop and after-call, not a raw interaction log. So CRM more naturally consumes crm_contacts. Keep (a) only if CRM genuinely ingests the interaction record itself. Changing the payload is a corrective overwrite, so it is surfaced for your call.

a6:

---

q7: Keep both call-recording masters in the catalog (call_recordings in Sales Engagement and ccaas_call_recordings in CCaaS), or merge them under one canonical master?

- a) Keep both, with a documented split.
- b) Merge under a single canonical master.

Recommended: a. The two recordings serve different markets with different lifecycles: CCaaS recordings (Genesys, NICE, Five9, Amazon Connect Contact Lens, Talkdesk) are governed by TCPA/PCI two-party-consent and contact-center retention and feed quality scoring; sales-call recordings (the Sales Engagement / conversation-intelligence surface, e.g. Gong, Chorus) are governed by sales-coaching retention and feed deal intelligence. Merging would force one consent/retention/redaction profile onto two genuinely different recording markets. This interacts with q8.

a7:

---

q8: Where does Conversation Intelligence (Gong, Chorus) sit relative to CCaaS recordings and quality management?

- a) A downstream consumer of CCaaS recordings.
- b) A separate vendor surface (its own domain) that overlaps CCaaS quality management.
- c) A feature of Sales Engagement, where the sales call_recordings master already lives.

Recommended: b. Gong and Chorus are pure-play revenue-intelligence vendors that ingest recordings and produce deal and coaching insight, which is a distinct surface from the contact-center QM market (Genesys, NICE, Verint, and Calabrio score interactions against evaluation forms). Modeling Conversation Intelligence as its own domain that consumes recordings from both CCaaS and Sales Engagement is the cleanest fit; it is already at mention_count=2 in the missing-domains backlog. This decision affects q7 (whether the two recording masters stay split).

a8:

---

q9: Handoff 722 (a KMS knowledge-article update feeding CCaaS) carries two process tags. Delete the stale one (PCF 21679 "Deliver approved content") and keep PCF 20898 "Maintain service support knowledge repository"? (yes/no)

Recommended: yes. A knowledge-article update is a knowledge-repository maintenance activity, not a content-delivery activity, so PCF 20898 is the correct mapping and 21679 is the duplicate. The delete is destructive, so it needs your confirmation.

a9:

---

q10: Two CONV-AI-to-CCaaS handoffs (743 "conversation flow fallback" and 746 "bot definition published") were originally judged to have no clean cross-industry process match, but later got generic auto-tags. How should the tags be handled?

- a) Keep both auto-tags (743 -> "Resolve customer problems", 746 -> "Deploy services/solutions").
- b) Delete both and let a later Discover pass author custom processes.
- c) A mix.

Recommended: b. Both auto-tags are generic and conflict with the original judgment that bot-fallback engineering and bot-runtime publication have no clean PCF cross-industry match. Deleting them and letting Discover author purpose-fit custom processes keeps the mappings honest. The delete is destructive, so it needs your sign-off.

a10:

---

## Optional (will not hold up the build)

q11: Flagship CCaaS vendors model several entities the CCaaS footprint does not yet carry: agent skill assignments, callback requests, wrap-up reasons, outbound campaigns, agent scorecards, speech-analytics categories, and IVR languages. Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the module and WEM decisions are confirmed. Agent skill assignments and callback requests are first-class across Genesys, NICE, Five9, Amazon Connect, and Talkdesk and are the strongest candidates; outbound_campaigns depends on q1 (whether a Dialer module exists); agent_scorecards and speech_analytics_categories depend on q2 (whether WEM stays in CCaaS). Each still wants a Phase 0 verification pass before loading.

a11:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-WEM-SCOPE q3=B2-NAMING-ARBITRATION q4=B2-DESC-EMDASH-BRITISH q5=B2-INTENT-IDENTIFIED-OWNERSHIP q6=B2-CONTACT-RECORDS-CRM-CONSUMER q7=B2-CALL-RECORDINGS-SPLIT q8=B2-CONV-INTEL-RELATIONSHIP q9=B2-H722-DEDUPE-DELETE q10=B2-H743-746-RETAG q11=B3-AGENT-SKILL-ASSIGNMENTS,B3-CALLBACK-REQUESTS,B3-WRAP-UP-REASONS,B3-OUTBOUND-CAMPAIGNS,B3-AGENT-SCORECARDS,B3-SPEECH-ANALYTICS-CATEGORIES,B3-IVR-LANGUAGES | domain_id=98 -->
