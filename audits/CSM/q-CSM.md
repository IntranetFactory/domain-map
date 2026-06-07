# Customer Service Management (CSM): questions waiting for you

## What this domain is
Capture, triage, and resolve customer support cases across every channel, backed by knowledge and entitlement-bound SLAs.

Take in support requests from any channel, route and triage them with AI assistance, and work them to resolution with the help of a knowledge base. Track each customer's service entitlements and support tier so the right SLA clock applies, capture satisfaction after the case closes, and feed health and churn-risk signals back to the teams that own the account.

---

q1: (answer this first) CSM-KNOWLEDGE is a module that owns no master entity of its own (it only edits ITSM-owned knowledge articles and reads cases). How should that be handled?

- a) Accept it as-is and document why (it is an editorial, audience-filtered view onto the ITSM-mastered knowledge base, thin by design).
- b) Demote it to a starter module (lossy: the Knowledge Management capability loses its only realizing module).
- c) Give it its own master, a CSM-specific customer_knowledge_articles entity (audience-filtered editions of the ITSM articles).

Recommended: a. It is a deliberate editorial view and accepting it keeps the Knowledge Management capability intact. This choice also decides whether the support personas (agent, team lead, entitlement manager) can be authored, so it unlocks the rest of the build.

a1:

---

q2: When CSM sends out customer-keyed signals (for example a health-drop alert), there is no single owning module to credit as the source, because CSM reads the customer record in two modules but owns it in neither. How should those handoffs be attributed?

- a) Leave the source module blank and accept that customer-keyed outbound has no clean attribution.
- b) Pick the case-management module as the source by convention (these are case-driven health signals).
- c) Introduce a new CSM-owned customer_health_signals entity and re-key the events to it (cleanest, but broader modeling work that also reshapes the omnichannel-sessions idea below).

Recommended: c. It is the most catalog-coherent fix and gives the health signals a real home, though it is the most modeling work. This decision also unblocks the mis-attributed payment-failed event and the customer-tie handoffs.

a2:

---

q3: 49 inbound handoffs land payloads on CSM that no CSM module is set up to receive (for example sales opportunities, contact-center sessions, product-feedback signals, and industry-specific "opens a case" events). How should that gap be closed?

- a) Author the missing receiver records on the case-management module (treat opportunities, sessions, product feedback, and vertical payloads as things CSM consumes).
- b) Move the targets to other domains where they fit better (CRM-internal or account planning).
- c) Drop the handoffs that have no real effect on a CSM workflow.

Recommended: a, per cluster. Sales opportunities and contact-center sessions are common CSM workflow subjects, so most of these deserve a receiver on CSM; judge each cluster on its own.

a3:

---

q4: CSM has three cross-cutting capabilities (AI triage, SLA management, knowledge management) and no CSM-specific ones, even though every vendor markets case routing, omnichannel engagement, and agent assist as flagship features. What should the capability surface be?

- a) Add CSM-specific capabilities: case routing, omnichannel engagement, agent assist.
- b) Accept the three cross-cutting capabilities as the full surface.
- c) Add new cross-cutting capabilities (omnichannel engagement, CSAT/NPS) that would also light up neighboring domains.

Recommended: a. Domain-specific capabilities make CSM's flagship features visible at the capability layer and shape persona reach; pick (c) only if you want those capabilities shared across CCAAS, CRM, and marketing too.

a4:

---

q5: 4 cross-domain handoffs have no clean process-framework (APQC) match (a master-data sync, two product-management notifications, and an inventory expiry warning). 17 clean matches were already tagged, bringing coverage to 94%. What should happen to the 4 leftovers?

- a) Defer them to Discover (no clean process fit).
- b) Force a generic "Manage Customer Service" anchor onto all 4.

Recommended: a. None of the 4 has a clean process fit, so a forced generic tag would be misleading; leave them for Discover.

a5:

---

q6: Should a customer entitlement require a named approver to sign off on activation or upgrade? (yes/no)

Recommended: yes. Activation and upgrade are the natural signoff points for a support tier. This overwrites a current value, so it needs your confirmation.

a6:

---

q7: Should a CSAT response be locked once captured, so satisfaction results cannot be edited after the fact? (yes/no)

Recommended: yes. Survey responses should be immutable once submitted. This overwrites a current value, so it needs your confirmation.

a7:

---

q8: Should the customer-event log stay a plain append-only log with no approval or lock flags? (yes/no)

Recommended: yes. It is an append-only interaction log, so no signoff or lock flag applies. This confirms the current values.

a8:

---

q9: Six receiver records on CSM modules point at entities owned by other domains and currently break module self-containment. Fixing each one (either carrying a local shell of the entity or relaxing it to optional) rewrites existing rows. Approve those rewrites? (yes/no)

Recommended: yes, with the per-row fix recommended in the audit (carry a local shell for the customer record, relax the others to optional). These are destructive rewrites, so they need your sign-off.

a9:

---

q10: Should I schedule full reconciliation passes against the two heaviest neighbors (Subscription Management and CRM), or accept the inline summaries already produced?

- a) Accept the inline summaries, no further passes.
- b) Schedule full reconciliation runs on Subscription Management and CRM, with audit notes appended on those domains.

Recommended: b. The two heaviest neighbors carry the most boundary detail and are worth a dedicated pass, but this is optional and does not hold up CSM.

a10:

---

## Optional (will not hold up the build)

q11: Across the five flagship support vendors, eleven extra entities recur that CSM does not model yet (case comments, case attachments, installed products, service contracts, SLA definitions, agent macros, escalation rules, support queues, service calendars, CSAT surveys, and CSM-side omnichannel sessions). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the decisions above land. The omnichannel-sessions one also closes one of the boundary gaps in q3.

a11:

---

<!-- agent map, ignore: q1=B2-CSM-KNOWLEDGE-MASTER q2=B2-CUSTOMERS-AMBIGUITY q3=B2-CROSS-DOMAIN-INTEGRITY q4=B2-CAPABILITY-SHAPE q5=B2-APQC-SCOPE q6=B2-PATTERN-FLAGS.entitlements q7=B2-PATTERN-FLAGS.csat q8=B2-PATTERN-FLAGS.events q9=B1A-SELF-CONTAIN q10=B2-PAIRWISE-SCHEDULING q11=B3-CASE-COMMENTS+B3-CASE-ATTACHMENTS+B3-INSTALLED-PRODUCTS+B3-SERVICE-CONTRACTS+B3-SLA-DEFINITIONS+B3-MACROS+B3-ESCALATION-RULES+B3-SUPPORT-QUEUES+B3-SERVICE-CALENDARS+B3-CSAT-SURVEYS+B3-OMNICHANNEL-SESSIONS | domain_id=30 -->
