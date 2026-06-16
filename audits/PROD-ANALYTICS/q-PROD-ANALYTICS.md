# Product Analytics (PROD-ANALYTICS): questions waiting for you

## What this domain is
Product Analytics instruments a digital product, captures behavioral events, and answers questions about how people actually use it: feature-usage events, funnels, retention and cohort analysis, user paths, and behavioral segmentation. The buyer is the product, growth, or PLG team. It sits downstream of a Customer Data Platform (which can pipe events in), exports aggregates to BI, and feeds usage signals to Product Management, without being any of them.

PROD-ANALYTICS is not in the catalog yet (the gap was flagged while scoping the Digital Adoption Platform candidate). These questions decide whether to build it and how to bound it against BI, CDP, Product Management, and the DAP candidate, plus two scope seams (experimentation and session replay). Nothing has been written to the catalog.

---

q1: (answer this first) Should Product Analytics be created as its own domain, rather than folded into Business Intelligence or left queued?

- a) Promote it as a domain: create PROD-ANALYTICS mastering the in-product event stream, the analysis surface (funnels, retention, paths, cohorts), and segmentation across three core modules, consuming the event pipe from CDP, exporting aggregates to BI, and handing off feature-usage signals to Product Management.
- b) Fold it into BI: treat product analytics as a module or capability of Business Intelligence.
- c) Keep it queued in the backlog and revisit later.

Recommended: a. Five pure-play flagships sell a product built around instrumenting a product and analyzing in-product behavior, Amplitude, Mixpanel, Heap (retroactive autocapture), PostHog (open-source product OS), and June (B2B SaaS analytics), with Pendo straddling into adoption. They master their own event/user/session data model and purpose-built funnel/retention/path/cohort analysis, and exist independently of BI vendors (Tableau, Power BI, Looker). BI masters generic governed dashboards over modeled warehouse data, a different artifact, and product analytics is a recognized standalone Gartner and G2 category. Promotion is additive; nothing is written to the catalog until you approve this.

a1:

---

q2: A Customer Data Platform unifies cross-channel identity and pipes events into product analytics. Who should master the unified customer profile and identity graph, and who should master the in-product event stream and product-scoped user record?

- a) Split by lens: CDP masters the unified cross-channel customer profile, the identity-resolution golden record, and audience segments; PROD-ANALYTICS masters the in-product behavioral event stream, a product-scoped user projection, and in-product identity merges, with a sync handoff from PA to CDP for activation.
- b) CDP masters it all: CDP owns identity, events, and segments; PROD-ANALYTICS consumes the event store rather than mastering it.

Recommended: a. Segment, mParticle, and Tealium (CDP pure-plays) pipe events into Amplitude and Mixpanel: the CDP unifies and routes, the analytics tool analyzes. Audience segments are already CDP/marketing-mastered in the catalog. But Amplitude has added CDP features and Heap and PostHog ingest first-party events directly, so a product-scoped event and user store distinct from the CDP golden profile is real. The split keeps one master per concept (CDP owns the golden profile and cross-channel segments; PROD-ANALYTICS owns the in-product event store and its own analytics segments) and avoids double-mastering identity.

a2:

---

q3: The DAP candidate's adoption-analytics slice was flagged for extraction into Product Analytics. Should PROD-ANALYTICS be the canonical master of the shared analytics entities, with DAP consuming them, and how is the overlapping user-segments entity resolved?

- a) PA masters, DAP consumes: PROD-ANALYTICS is the canonical master of feature events, funnels, user paths, retention cohorts, goals, and session replays; DAP keeps only its per-flow engagement stats and consumes the rest. PROD-ANALYTICS masters user segments and DAP references them (or keeps a DAP-local targeting substrate).
- b) DAP keeps its own copies: DAP re-masters the analytics entities locally and PROD-ANALYTICS masters a parallel set.

Recommended: a. Both candidates surfaced the same entities from the same vendor surface (Pendo sells DAP and product analytics as one product; Amplitude, Mixpanel, Heap, and PostHog own the deep funnel, retention, path, and cohort engine). Phase 0 deliberately aligned the names so there is one master, not two. The single-master rule forbids two masters on feature events, funnels, or user segments, so PROD-ANALYTICS should own the analytics engine while DAP consumes and keeps only its per-flow engagement stats. Option b is listed only for completeness; it violates the single-master rule.

a3:

---

q4: Should experimentation (A/B testing, feature flags) be in-scope of Product Analytics, or a separate domain that PA links to?

- a) Separate domain: experimentation and feature management is its own domain (feature flags, experiments, assignments); PROD-ANALYTICS gets a consumer edge (experiment exposure logged as events, metric lifts computed on PA's stream).
- b) In-scope: PROD-ANALYTICS ships an experimentation module mastering experiments, variants, assignments, feature flags, and metric lifts.

Recommended: a. The evidence is split: Amplitude (Experiment), PostHog, and Pendo bundle experiments, but Mixpanel, Heap, and June do not (3 of 6 vendors), and LaunchDarkly and Statsig are a distinct feature-management and experimentation market. Feature flags belong with feature management, not analytics. Keeping experimentation a separate domain with a PROD-ANALYTICS consumer edge matches how the strongest pure-plays (Mixpanel, Heap) draw the line. Choose b only if you want a deliberately wide Product Analytics scope.

a4:

---

q5: Should session replay and experience analytics (session replay, heatmaps) be in-scope of Product Analytics, or a separate domain that PA links to?

- a) Separate domain: a digital-experience-analytics domain masters session replays and heatmaps; PROD-ANALYTICS links to a replay from a funnel drop-off.
- b) In-scope: PROD-ANALYTICS ships a session-analytics module mastering session replays, replay events, and heatmaps.

Recommended: a. Session replay is present in only 3 of the 6 surveyed PA vendors (Amplitude, PostHog, and Pendo add it; Mixpanel, Heap, and June omit it), and there is a robust standalone experience-analytics market (FullStory, Hotjar, Contentsquare, LogRocket). Keeping session replay a separate digital-experience-analytics domain, with PROD-ANALYTICS linking to a replay from a funnel drop-off, matches the pure-play landscape. Choose b only if you want a deliberately wide Product Analytics scope.

a5:

---

<!-- agent map, ignore: q1=B2-PA-PROMOTE q2=B2-PA-CDP-IDENTITY q3=B2-PA-DAP-MASTER q4=B2-PA-EXPERIMENTATION q5=B2-PA-SESSION-REPLAY | domain_id=null (unbuilt candidate) -->
