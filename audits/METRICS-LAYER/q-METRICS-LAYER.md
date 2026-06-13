# Metrics Layer (METRICS-LAYER): questions waiting for you

## What this domain is
Define your business metrics once and serve them to every dashboard, agent, and app.

A single declarative layer where your measures, dimensions, joins, and access rules live, so the same number means the same thing everywhere it is read. Metrics are authored, certified, and versioned in one place, then delivered over SQL, REST, GraphQL, and MDX so every BI tool, AI agent, and embedded app reads from the same definitions instead of drifting apart. The result is faster, trusted analytics, agents that quote correct numbers, and governed access without rebuilding the same logic in every tool.

---

q1: (answer this first) How should the five master tables be named?

- a) Keep them as they are (metric_definitions, dimensional_models, metric_materializations, query_lineage_records, metric_access_policies).
- b) Rename metric_definitions to the bare word metrics and claim it as the canonical name.
- c) Rename metric_definitions to semantic_metric_definitions.

Recommended: a. The current names have no live collision, and keeping the longer name leaves the bare word "metrics" free for a future aggregated-table master that BI or the data platform may want. The headline master name ripples through every other answer below, so settle it first.

a1:

---

q2: Should a certified metric be frozen so it cannot be edited until it is re-drafted? (yes/no)

Recommended: yes. A certified metric is a published contract that dashboards and agents rely on; locking it forces changes to go through a fresh draft, which is how the headless-BI vendors behave.

a2:

---

q3: Should metric certification require sign-off from one named approver (the data-product owner)? (yes/no)

Recommended: yes. Certification is the trust gate for the whole layer, so a single accountable approver is standard.

a3:

---

q4: Should activating an access policy require sign-off from one named approver? (yes/no)

Recommended: yes. An access policy decides who can read which metric outputs, so a single approval before it goes live is normal.

a4:

---

q5: Should a published dimensional model be frozen while live consumers still point at it? (yes/no)

Recommended: yes. Editing a model in place under live consumers breaks them silently; freezing it forces a new version instead.

a5:

---

q6: The buyer-voice tagline and description have already been written into the domain and its three modules. Review them in the catalog UI and tell me how to proceed.

- a) Approve the written copy as is and mark the records reviewed.
- b) Edit specific rows yourself in the catalog UI.
- c) Tell me to rewrite a specific row with wording you supply.

Recommended: a. The copy was authored in buyer voice and is awaiting only your review; approve it unless a specific line needs changing.

a6:

---

q7: An inbound handoff from the catalog domain (a deprecated-metric signal) carries a process tag that is a false-positive keyword match on the word "metric." How should it be handled?

- a) Leave the tag pending so a reviewer can reject it later (the safe default).
- b) Approve rejecting the bad tag now and let me add a correct tag in its place.
- c) Let me add a correct tag alongside the bad one, and you pick the winner later.

Recommended: b. The tag is clearly wrong, so rejecting it and replacing it is the cleanest fix. Rejecting an existing tag is a destructive change, so it needs your explicit sign-off.

a7:

---

q8: Should Looker be ranked as a primary or a secondary solution for this domain?

- a) Keep it secondary (it is sold and bought mainly as a BI tool, with its metrics language as one feature).
- b) Promote it to primary (its metrics language is the metrics-layer surface, and the BI dashboards sit on top).

Recommended: a. Looker goes to market as a BI product, so keeping it secondary ranks it correctly against the dedicated metrics-layer vendors.

a8:

---

q12: Business Intelligence and Analytics forwards metric materialization to Metrics Layer / Headless BI to triage IT service delivery incidents, but Metrics Layer / Headless BI does not yet have anyone assigned to triage IT service delivery incidents, so this step has no owner. How should it be handled?
- a) Record it now as work Metrics Layer / Headless BI owns, and assign a named owner once Metrics Layer / Headless BI sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Metrics Layer / Headless BI decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

q13: Data and AI Platform forwards metric definition to Metrics Layer / Headless BI to establish data, information, and analytic governance, but Metrics Layer / Headless BI does not yet have anyone assigned to establish data, information, and analytic governance, so this step has no owner. How should it be handled?
- a) Record it now as work Metrics Layer / Headless BI owns, and assign a named owner once Metrics Layer / Headless BI sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Metrics Layer / Headless BI decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Data and AI Platform forwards metric materialization to Metrics Layer / Headless BI to maintain business information feeds and repositories, but Metrics Layer / Headless BI does not yet have anyone assigned to maintain business information feeds and repositories, so this step has no owner. How should it be handled?
- a) Record it now as work Metrics Layer / Headless BI owns, and assign a named owner once Metrics Layer / Headless BI sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Metrics Layer / Headless BI decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

## Optional (will not hold up the build)

q9: Four extra master tables show up across the flagship metrics-layer vendors (named saved metric views, registered downstream consumers, metric assertion or quality rules, and a metric-change-as-pull-request workflow). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the current build settles. Each is common across the vendor set yet still wants a verification pass to confirm it is distinct from what is already modeled.

a9:

---

q10: The delivery module currently bundles three protocol families (BI-native SQL and MDX, web-native REST and GraphQL, AI-native tool-use). Should I plan to split it into separate BI-delivery and AI-delivery modules later? (yes/no)

Recommended: no for now. One delivery module is the right size today; revisit only if the AI-native surface grows enough to stand on its own. Non-blocking.

a10:

---

q11: There are no compliance frameworks tagged on this domain yet. Should I research and tag the candidates (SOX for metrics behind financial reporting, GDPR and CCPA for access policies over personal data, HIPAA when metrics aggregate health data)? (yes/no)

Recommended: yes, pending a check on whether to tag at the metrics layer or the BI layer. Additive and non-blocking.

a11:

---

<!-- agent map, ignore: q1=B2-NAMING-ARBITRATION q2=B2-PATTERN-FLAGS.mdsubmitlock q3=B2-PATTERN-FLAGS.mdapprover q4=B2-PATTERN-FLAGS.policyapprover q5=B2-PATTERN-FLAGS.modelsubmitlock q6=B2-CATALOG-UX q7=B2-DCG-INBOUND-TAG q8=B2-LOOKER-RECLASSIFICATION q9=B3-METRIC-VIEWS+B3-METRIC-CONSUMERS+B3-METRIC-ASSERTION-RULES+B3-METRIC-CHANGE-PROPOSALS q10=B3-DELIVERY-SPLIT q11=B3-REGULATION-TAGGING q12=B2-B9D-OWN-1299 q13=B2-B9D-OWN-1203 q14=B2-B9D-OWN-1213 | domain_id=137 -->
