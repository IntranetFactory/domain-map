# Customer Service Management (CSM): questions waiting for you

## What this domain is
Capture every customer issue, triage it across channels, and resolve it fast against the support level the customer is owed.

Customer Service Management turns inbound questions, complaints, and incidents into tracked cases your team can route, prioritize, and close. Capture cases from email, chat, phone, and social in one queue, then let triage and AI-assisted classification put each one in front of the right agent with the right context.

Resolve faster with a knowledge surface that suggests answers as agents work and lets them publish proven fixes back for self-service. Bind every case to the entitlements and service levels the customer has paid for, so response and resolution clocks reflect real contractual commitments and breaches are visible before they happen.

---

q1: (answer this first) CSM-KNOWLEDGE is a module that owns no master entity of its own: today it only edits the ITSM-owned knowledge base and reads cases. How should that be handled?

- a) Accept it as-is: a thin editorial, audience-filtered view onto the ITSM-mastered knowledge base.
- b) Demote it to a starter module (lossy: the Knowledge Management capability loses its only realizing module).
- c) Give CSM-KNOWLEDGE a customer-facing knowledge master of its own.

Recommended: c (this reverses the earlier recommendation after fresh vendor research this pass). 4 of the 5 flagship support vendors master their own customer-facing knowledge base as a first-class product: Zendesk Guide (Help Center articles/sections/categories), Salesforce Knowledge (its own KnowledgeArticleVersion object, not a borrowed IT table), Freshdesk Solutions, and Intercom Articles all own their KB; only ServiceNow CSM reuses the platform-wide knowledge table it shares with ITSM. So "thin editorial view onto the IT knowledge base" under-models the market: a customer support KB is normally owned by the support product, which is why CSM-KNOWLEDGE should own one. Implementation nuance: rather than minting a brand-new duplicate entity, carry the customer-facing KB as an audience-filtered embedded master of the existing knowledge article (a standalone customer edition that defers to the IT-owned article when both deploy together), matching the single-object, audience-filtered model Salesforce and ServiceNow validate, and resolving the two knowledge-article self-containment rows in q9. This choice also decides whether the support personas (agent, team lead, entitlement manager) can be authored, so it unlocks the rest of the build.

a1:

---

q2: When CSM sends out customer-keyed signals (for example a health-drop or churn-risk alert), there is no single owning module to credit as the source, because CSM reads the customer record in two modules and owns it in neither. How should those handoffs be attributed?

- a) Leave the source module blank and accept that customer-keyed outbound has no clean attribution.
- b) Attribute them to the case-management module by convention (these are case-driven signals).
- c) Introduce a new CSM-owned customer_health_signals entity and re-key the events to it.

Recommended: b (this reverses the earlier recommendation after fresh vendor research this pass). No flagship support desk (Zendesk, Salesforce Service Cloud, ServiceNow, Freshdesk, Intercom) masters a customer health-score or churn-risk record: health scoring is Customer-Success-platform territory (Gainsight, Totango, ChurnZero). Support desks emit signals (CSAT, case volume); they do not own the score. So option (c), introducing a CSM-mastered health entity, is over-modeling and not vendor-justified. Attribute the customer-keyed outbound to the case-management module instead (these are case-derived signals), and treat the CSAT response CSM already masters as the real signal it contributes. This also disposes of the mis-attributed payment-failed event and the customer-tie handoffs that are gated on this answer.

a2:

---

q3: 49 inbound handoffs land payloads on CSM that no CSM module is set up to receive (for example sales opportunities, contact-center sessions, product-feedback signals, and industry-specific "opens a case" events). How should that gap be closed?

- a) Author the missing receiver records on the case-management module, judged per cluster.
- b) Move the targets to other domains where they fit better (CRM-internal or account planning).
- c) Drop the handoffs that have no real effect on a CSM workflow.

Recommended: a, per cluster. Vendor research this pass confirmed the split. Closed-won sales opportunities (Salesforce converts these into onboarding cases) and contact-center / voice sessions (Salesforce Agentforce Contact Center and Zendesk voice escalate a session into a case with its transcript) are genuine things CSM receives and turns into cases, so author receivers for them on the case-management module. Product-feedback signals (features, releases, beta programs, feedback items, metrics) are NOT a CSM master in any flagship; they land as a comment or tag on a case at most, so consume them thinly or drop them rather than authoring heavyweight receivers. The vertical "opens a case" rows (insurance, banking, healthcare, etc.) are all genuine case-creation sources and get a case-management receiver.

a3:

---

q4: CSM has four cross-cutting capabilities (AI triage, SLA management, knowledge management, Customer 360) and no CSM-specific ones, even though every flagship vendor markets case routing, omnichannel engagement, and agent assist as headline features. What should the capability surface be?

- a) Add CSM-specific capabilities: case routing, omnichannel engagement, agent assist (and CSAT/NPS).
- b) Accept the existing cross-cutting capabilities as the full surface.
- c) Add new cross-cutting capabilities (omnichannel engagement, CSAT/NPS) that would also light up neighboring domains.

Recommended: a. All five flagship vendors market case routing/assignment, omnichannel engagement, agent assist (Zendesk Copilot, Salesforce Agentforce, ServiceNow Now Assist, Freddy, Fin), CSAT/NPS, and self-service knowledge as headline capabilities (SLA management in four of five). Today none of routing, omnichannel, or agent-assist is visible at the capability layer, which is what shapes persona reach and module coverage. Add them. Nuance: omnichannel-engagement and CSAT/NPS plausibly span CCAAS, CRM, and marketing, so those two are good candidates to model as cross-cutting (the spirit of option c) while case-routing and agent-assist stay CSM-specific. Pick (c) instead only if you want all of them shared.

a4:

---

q5: 4 cross-domain handoffs have no clean process-framework (APQC) match (a master-data sync, two product-management notifications, and an inventory expiry warning). 17 clean matches were already tagged, bringing coverage to 94%. What should happen to the 4 leftovers?

- a) Defer them to Discover (no clean process fit).
- b) Force a generic "Manage Customer Service" anchor onto all 4.

Recommended: a. None of the 4 has a clean process fit, so a forced generic tag would be misleading; leave them for Discover.

a5:

---

q6: Should a customer entitlement require a named approver to sign off on activation or upgrade? (yes/no)

Recommended: no, do not set the single-approver flag. Since the last audit, the customer-entitlement record was classified as configuration data (a "catalog" entity, like a service-tier definition). On configuration data the approver is expressed through the activation lifecycle step and its responsibility assignment, not through the per-record single-approver flag, which the system deliberately ignores on configuration entities (and an audit rule would flag it as a contradiction). So the right way to require activation signoff is to keep the flag off and let the activation step carry the approval. If you instead believe entitlements behave like a live operational record rather than configuration, say so and we will revisit the classification first.

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

Recommended: yes, with the per-row fixes in the audit: carry a local shell for the customer record, and relax the subscription and contract rows to optional. Note: the two knowledge-article rows in this set are better resolved by q1 option (c) above. If CSM-KNOWLEDGE gets its own customer-facing knowledge master, those two rows are replaced rather than relaxed. These are destructive rewrites, so they need your sign-off.

a9:

---

q10: Should I schedule full reconciliation passes against the two heaviest neighbors (Subscription Management and CRM), or accept the inline summaries already produced?

- a) Accept the inline summaries, no further passes.
- b) Schedule full reconciliation runs on Subscription Management and CRM, with audit notes appended on those domains.

Recommended: b. The two heaviest neighbors carry the most boundary detail and are worth a dedicated pass, but this is optional and does not hold up CSM.

a10:

---

q12: A handoff from Subscription Management to CSM (a failed-payment alert) is currently labeled as if CSM were the team that "processes and distributes payments." CSM does not distribute payments; when a payment fails it opens a customer case to chase it. The label and the underlying event are mis-attributed (this is the same root issue as the payment-failed event noted under q2). How should this be handled?

- a) Re-key the failed-payment event to its real publisher (the invoice on Subscription Management) and re-label the CSM side as a case-opening step (payment dispute opened), not payment distribution.
- b) Record "process and distribute payments" as work CSM owns and assign it an owner.
- c) Leave it as-is for now and revisit under q2.

Recommended: a. CSM never moves money; the failed-payment signal belongs to the invoice/payment owner (Subscription Management), and CSM's real action is opening and working a case. Labeling CSM as the payment-distribution owner (option b) would credit it with work no support desk does. This is the same defect tracked internally as the mis-attributed payment-failed event under q2, so answering q2 settles the customer-keyed side and this settles the process-label side.

a12:

---

## Optional (will not hold up the build)

q11: Across the five flagship support vendors, extra entities recur that CSM does not model yet (case comments, case attachments, service contracts, SLA policies/milestones, business-hours schedules, routing rules, canned responses, agent teams, escalation rows, knowledge categories/versions, and CSM-side omnichannel sessions). Vendor research this pass confirmed case comments, case conversations, agent teams, routing rules, canned responses, and knowledge categories/versions are all Core (present in all five). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the decisions above land. The omnichannel-sessions one also closes one of the boundary gaps in q3.

a11:

---

<!-- agent map, ignore: q1=B2-CSM-KNOWLEDGE-MASTER q2=B2-CUSTOMERS-AMBIGUITY q3=B2-CROSS-DOMAIN-INTEGRITY q4=B2-CAPABILITY-SHAPE q5=B2-APQC-SCOPE q6=B2-PATTERN-FLAGS.entitlements q7=B2-PATTERN-FLAGS.csat q8=B2-PATTERN-FLAGS.events q9=B1A-SELF-CONTAIN q10=B2-PAIRWISE-SCHEDULING q12=B2-B9D-OWN-1422 q11=B3 | domain_id=30 phase0=.tmp_deploy/CSM-phase0-2026-06-08.md -->
