# Digital Experience Monitoring (DEM): questions waiting for you

## What this domain is
Measure how fast and reliable your apps and sites feel to the people actually using them, across the browser, the device, and the network in between. Run synthetic probes from real-world locations, capture real user sessions, score the experience, and flag friction and anomalies before users complain. When something degrades, hand a clean signal to your incident, observability, and AIOps teams.

---

q1: (answer this first) How should Digital Experience Monitoring be split into modules (the sub-areas of the product)?

- a) Two modules: Endpoint Experience (experience scores, anomaly findings, digital friction events) and Web Experience (synthetic monitoring results, real user sessions).
- b) Three modules: same as (a) plus a SaaS Reachability module, added once the SLA-compliance and application-response-trace objects land.
- c) One module: keep DEM as a single module for now, valid while it has zero capabilities so the two-module floor does not yet bind.

Recommended: a. The two-module split is the minimal shape that unblocks the build today; the third module in (b) only pays off once those extra objects exist, and a single module in (c) will have to be split again as soon as capabilities are authored. This choice drives the module set, the capability and solution loads, and every per-module link below it, so it unlocks the rest of the build.

a1:

---

q2: How should the overlap with Digital Employee Experience (the Nexthink / 1E / ControlUp / Lakeside / HappySignals category) be handled?

- a) Absorb that category into DEM and do not create a separate Digital Employee Experience domain.
- b) Create a separate Digital Employee Experience domain and move endpoint experience scores, anomaly findings, and digital friction events to it (leaving DEM scoped to real-user, synthetic, and SaaS reachability monitoring).
- c) Keep both with deliberate overlap, and let dual-coverage vendors be linked to each via solution coverage.

Recommended: c. The market positions employee-experience tools as IT-Ops focused and DEM tools as SRE / web-ops focused, so keeping both with explicit overlap is closest to vendor reality; (a) is the smallest change if you would rather not stand up a second domain. This interacts with the module split in q1 and decides where the endpoint objects live.

a2:

---

q3: Should real user sessions be flagged as containing personal data (they capture end-user browser session data)? (yes/no)

Recommended: yes. Real user monitoring records identifiable end-user usage, so it should carry the personal-data flag and its retention rules. Setting this flag is a confirmation step, so it is not applied automatically.

a3:

---

q4: Should digital friction events be flagged as containing personal data (they are per-user friction telemetry)? (yes/no)

Recommended: yes. Per-user friction telemetry is identifiable usage data and should carry the personal-data flag. Setting this flag is a confirmation step, so it is not applied automatically.

a4:

---

q5: Should endpoint experience scores be flagged as containing personal data (they are per-user / per-device scores)? (yes/no)

Recommended: yes. A per-user or per-device score is tied to an identifiable person, so it should carry the personal-data flag. Setting this flag is a confirmation step, so it is not applied automatically.

a5:

---

q6: One trigger event, "digital friction event recorded," fires but nothing listens to it (zero handoffs anywhere). How should it be handled?

- a) Delete it (the event is not actually published anywhere).
- b) Keep it and author a new handoff so a recorded friction event can open a proactive ticket in your IT service management domain.

Recommended: b. Authoring the proactive-ticket handoff puts the event to use rather than discarding signal, and it is the additive option. Deleting the event is destructive, so either way this needs your sign-off.

a6:

---

## Optional (will not hold up the build)

q7: A vendor-surface scan suggests eight deeper objects across the flagship DEM tools (synthetic monitor definitions, monitoring locations, page-load events, web vitals, performance baselines, SLA-compliance records, device-health summaries, application-response traces). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Two of the eight (device-health summaries, application-response traces) straddle the employee-experience and application-performance boundaries and should wait until q2 and the application-performance question below are settled.

a7:

---

q8: Should I queue a separate Application Performance Monitoring domain (the Datadog APM / Dynatrace APM / New Relic APM / AppDynamics category), distinct from the existing Application Portfolio Management domain that already uses a similar code? (yes/no)

Recommended: yes, as a candidate to triage later. It would own the application-response-trace object from q7 and keep that market from being conflated with DEM. Additive and non-blocking.

a8:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-DEX-BOUNDARY q3=B2-PATTERN-FLAGS.rum q4=B2-PATTERN-FLAGS.friction q5=B2-PATTERN-FLAGS.scores q6=B1A-B9-ORPHAN q7=B3-MARKET-ENTITIES q8=B3-APM-MONITORING | domain_id=83 -->
