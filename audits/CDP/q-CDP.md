# Customer Data Platform (CDP): questions waiting for you

## What this domain is
Pull every customer signal into one resolved profile, then act on it. Ingest events from web, mobile, email, in-product, and partner systems; stitch the identities behind them into a single golden profile; build audience segments and observe each customer's journey; and activate all of it to your downstream marketing, sales, service, and loyalty tools. The four modules in place today are Ingest and Identity, Unified Profile, Segmentation and Activation, and Journeys 360.

---

q1: (answer this first) Where should the `customers` master live? Today it is single-master in the Unified Profile module, but the catalog copy hints at a multi-master pattern (CRM owns the sales view, CSM the service view, SUB-MGMT the financial view, CDP the unified resolved profile).

- a) Keep `customers` single-master in CDP; CRM, CSM, and SUB-MGMT add consumer views of it at their own next audits.
- b) Promote `customers` to a shared master in the Unified Profile module and let CRM, CSM, and SUB-MGMT embed it (embedded_master).
- c) Adopt the explicit multi-master decomposition the description hints at.

Recommended: a. The live state already places `customers` single-master in CDP, and (a) lets each consuming domain mirror it without a disruptive restructure. This choice sits upstream of the module scope and the Unified Profile primary master, so it unlocks the decisions below it.

a1:

---

q2: How should lifecycle states be authored across the six CDP masters? Five of them carry none today.

- a) Author lifecycles for `audience_segments` (draft / active / paused / archived) and `customer_journeys` (active / completed / abandoned); exempt `customer_events`, `customer_attributes`, and `identity_graphs` as config-shape (append-only stream, derived materialization, resolution overlay).
- b) A different split (specify which masters get lifecycles).
- c) All five masters get lifecycles (specify the state lists).

Recommended: a. The two workflow masters have real state machines; the other three are config-shape and warrant a Rule #12 exemption, which needs your explicit acknowledgement.

a2:

---

q3: The `customers` master has two state machines collapsed onto one (engagement: prospect, active, inactive, churned; billing: prospect, active, past_due, cancelled), which is why `state_order` 3 and 4 each appear twice. How should this be untangled?

- a) Re-order into a single linear sequence on `customers`.
- b) Split into two explicit state machines on the same master (an engagement axis and a billing axis).
- c) Move the billing states (past_due, cancelled) to a SUB-MGMT-mastered entity and leave only the engagement states on `customers`.

Recommended: b. Engagement and billing are conceptually independent lifecycles; keeping both on the master but as distinct axes restores the disambiguation that the collapse lost.

a3:

---

q4: Should the `customer_journey.exited` trigger event be categorized as a lifecycle event or a state change?

- a) Keep it as `lifecycle` (the journey ends, irreversible).
- b) Flip it to `state_change` (just another step transition).

Recommended: a. Adobe and Tealium model journey end as a terminal lifecycle event; it currently sits at `lifecycle`, which is the safer reading.

a4:

---

q5: How should Composable / warehouse-native CDP (reverse-ETL) be classified? It is currently a capability linked into the Segmentation and Activation module.

- a) Keep it as a CDP capability (current state).
- b) Split it into a separate REVERSE-ETL domain (Hightouch, Census, RudderStack, Polytomic, and Grouparoo pass the 3-vendor point-solution test).
- c) Treat it as its own CDP module (CDP-COMPOSABLE) but not a separate domain.

Recommended: b. Reverse-ETL vendors have a fundamentally different deployment model (zero-copy, warehouse-native) and clear the 3-vendor test, so a separate domain is the cleanest fit; pick (a) if you want to keep CDP broad for now.

a5:

---

q6: Should `customer_events.has_personal_content` flip to true? Event payloads routinely carry IP addresses, device fingerprints, and email-open content. (yes/no)

Recommended: yes. These are personal data under GDPR Article 4.

a6:

---

q7: Should `identity_graphs.has_personal_content` flip to true? The graph literally maps emails to devices to cookies. (yes/no)

Recommended: yes. Every row is personal data.

a7:

---

q8: Should `customer_journeys.has_personal_content` flip to true? These are per-customer journey traces. (yes/no)

Recommended: yes. Per-customer traces are personal data.

a8:

---

q9: Should `customer_attributes.has_personal_content` flip to true? It holds derived signals like LTV and churn likelihood at the per-customer grain. (yes/no)

Recommended: yes, but borderline. The values are derived rather than raw PII, yet they attach to an identified customer.

a9:

---

q10: Should `audience_segments.has_personal_content` flip to true? Segment definitions are abstract, but the membership rosters are personal. (yes/no)

Recommended: yes, but borderline. The definition is not personal, while the materialized roster is.

a10:

---

q11: Should LGPD (Brazil) be linked to CDP via `domain_regulations`? The regulation row does not exist yet and would need creating first. (yes/no)

Recommended: yes if you serve Brazilian data subjects. Flagship CDP vendors market against LGPD.

a11:

---

q12: Should IAB TCF v2 (the ad-tech transparency and consent framework) be linked to CDP? The regulation row does not exist yet and would need creating first. (yes/no)

Recommended: yes if any vendor passes consent strings; otherwise skip.

a12:

---

q13: Should Quebec Law 25 be linked to CDP? The regulation row does not exist yet and would need creating first. (yes/no)

Recommended: yes if you serve Quebec residents; otherwise skip.

a13:

---

q14: Should POPIA (South Africa) be linked to CDP? The regulation row does not exist yet and would need creating first. (yes/no)

Recommended: yes if you serve South African data subjects; otherwise skip.

a14:

---

## Optional (will not hold up the build)

q15: Should I research and add the deeper substrate entities that flagship CDP vendors ship (data sources, event sinks / destinations, activation runs, identity rules, merge decisions, consent records, data-subject requests, segment definitions, predictive models, model predictions, journey definitions)? These are the masters that would let the merged modules split apart cleanly. (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Each still wants a verification pass first.

a15:

---

q16: Once those entities land, should Consent and Privacy (consent records, data-subject requests) and Predictive (predictive models, model predictions) each be promoted from capabilities into their own CDP modules? (yes/no)

Recommended: yes, once they have masters to anchor them; today both are capabilities folded into Unified Profile with no master of their own.

a16:

---

q17: Should REVERSE-ETL be queued as a standalone candidate domain in the missing-domains list (this is the domain-tier version of the q5 classification)? (yes/no)

Recommended: yes, pending your q5 answer; if you keep composable CDP as a CDP capability, this entry can be retracted.

a17:

---

<!-- agent map, ignore: q1=B2-S5 q2=B2-S3 q3=B2-S8 q4=B2-S7 q5=B2-S6 q6=B2-S2.events q7=B2-S2.identity q8=B2-S2.journeys q9=B2-S2.attributes q10=B2-S2.segments q11=B2-S4.lgpd q12=B2-S4.tcf q13=B2-S4.quebec q14=B2-S4.popia q15=B3-MISSING-ENTITIES q16=B3-MOD-PROMOTIONS q17=B3-DOM-REVERSE-ETL | domain_id=72 -->
