# Digital Experience Monitoring (DEM): questions waiting for you

## What this domain is
See the digital experience your people and customers actually get, before they file a ticket.

Digital Experience Monitoring tells you whether the apps, devices, and SaaS your workforce and customers rely on are fast, available, and frustration-free. It runs synthetic checks from the locations that matter, captures real session telemetry, scores endpoint and application responsiveness, and flags friction and anomalies the moment they degrade the experience. Use it to catch slowdowns proactively, route the right signal to incident and operations teams, and prove that reachability and responsiveness meet the bar your business expects.

> Grounding: these recommendations are backed by a fresh vendor-surface study (8 flagship vendors across the DEM and DEX cohorts, 2025-2026 product docs) saved at `.tmp_deploy/DEM-phase0-2026-06-08.md`. One framing signal drives the scope calls: Gartner runs TWO separate 2025 Magic Quadrants here, "Digital Experience Monitoring" (Dynatrace, New Relic, Catchpoint, ManageEngine, SolarWinds) and "Digital Employee Experience Management Tools" (Nexthink, ControlUp, Riverbed Aternity Employee Experience). They are different markets with largely different vendors. DEM is app/service/API-centric across employees and customers; DEX is employee-centric with device health plus sentiment plus self-healing.

---

q1: (answer this first) How should Digital Experience Monitoring be split into modules (the sub-areas of the product)?

- a) Two modules: Web Experience (synthetic monitoring results, synthetic monitor definitions, probe locations, real user sessions, page-load events, web vitals, session replays) and Endpoint Experience (endpoint experience scores, endpoint anomaly findings, digital friction events).

- b) Three modules: the two above plus a SaaS Reachability module, added once SLA-compliance records and the SaaS-uptime surface are first-class.

- c) One module: keep DEM as a single module for now, valid while it has zero capabilities so the two-module floor does not yet bind.

Recommended: a. The DEM leaders fall into exactly these two pillars. The web/synthetic pillar is the Datadog RUM + Synthetic surface (RUM auto-collects Core Web Vitals per session, session replay, separate browser-test and API-test SKUs), the Dynatrace DEM capability (RUM + session replay + synthetic browser monitors), New Relic (browser + mobile RUM + synthetic + session replay), and Catchpoint (685+ probe nodes, 18 synthetic test types). The endpoint pillar is the Catchpoint DEX-Sonar module (real user + active + device monitoring on employee endpoints) and the ThousandEyes endpoint agent (per-user app experience plus scheduled synthetic tests from the device). A third SaaS-reachability module (b) would carry a single master today, so it does not pay off yet. A single module (c) will need splitting the moment capabilities are authored. This choice gates the module set, the capability and solution loads, and every per-module link below it.

a1:

---

q2: How should the overlap with Digital Employee Experience (the Nexthink / ControlUp / Riverbed Aternity Employee Experience / Lakeside / 1E category) be handled?

- a) Absorb that category into DEM and do not create a separate Digital Employee Experience domain.

- b) Create a separate Digital Employee Experience domain and move endpoint experience scores, endpoint anomaly findings, and digital friction events to it, leaving DEM scoped to real-user, synthetic, and SaaS-reachability monitoring.

- c) Keep both with deliberate overlap, and let dual-coverage vendors be linked to each via solution coverage.

Recommended: b, leaning to a careful migration of only the device/sentiment slice (REVERSED from the prior recommendation of c after the vendor check). Gartner treats these as two separate 2025 Magic Quadrants with largely different vendors: DEM (Dynatrace, New Relic, Catchpoint) measures app/service/API experience across employees AND customers, while DEX (Nexthink, ControlUp, Riverbed Aternity Employee Experience) measures employee sentiment plus device health plus self-healing automation. The vendor surfaces confirm the split: Nexthink's DEX score is built from device + application + network + sentiment with patent-pending "Moments of Experience" employee-journey tracking; ControlUp collects 1500+ endpoint metrics at a 3-second interval across physical and VDI/DaaS desktops; Aternity's DXI combines system performance with employee feedback in one score. The genuinely DEX-owned surface is device-health summaries, employee-sentiment responses, and self-healing/remediation actions, none of which DEM masters. The endpoint-experience-score and digital-friction concepts straddle the line (Catchpoint DEX-Sonar and ThousandEyes endpoint agents put a DEM-flavored version on the customer/SRE side; the employee-sentiment-weighted version is DEX), so promoting a DEX-PLATFORM domain and giving it the sentiment + device-health surface is closest to vendor reality, while DEM keeps the synthetic/RUM/score signal. Option (a) is the smallest change if you would rather not stand up a second domain. This interacts with the module split in q1 and decides where the endpoint objects live.

a2:

---

q3: Should real user sessions be flagged as containing personal data (they capture end-user browser session data)? (yes/no)

Recommended: yes. Real user monitoring captures identifiable end-user usage by construction. The leaders treat it as privacy-sensitive: Datadog and Dynatrace and New Relic all ship session replay (a frame-by-frame recording of the user's browser session) on top of RUM, which is exactly the surface privacy regulation governs, so the record should carry the personal-data flag and its retention rules. Setting this flag is a confirmation step, so it is not applied automatically.

a3:

---

q4: Should digital friction events be flagged as containing personal data (they are per-user friction telemetry)? (yes/no)

Recommended: yes. Per-user friction telemetry is identifiable usage data: in the DEX cohort these are exactly the per-employee "slow event / hung process / productivity blocker" records Nexthink and ControlUp and Aternity attribute to a named user and roll into a DEX score, so they should carry the personal-data flag. Setting this flag is a confirmation step, so it is not applied automatically.

a4:

---

q5: Should endpoint experience scores be flagged as containing personal data (they are per-user / per-device scores)? (yes/no)

Recommended: yes. A per-user or per-device score is tied to an identifiable person. Nexthink's DEX score and Aternity's DXI are both computed and reported at the individual-employee grain, so the score record is personal data and should carry the flag. Setting this flag is a confirmation step, so it is not applied automatically.

a5:

---

q6: One trigger event, "digital friction event recorded," fires but nothing listens to it (zero handoffs anywhere). How should it be handled?

- a) Delete it (the event is not actually published anywhere).

- b) Keep it and author a new handoff so a recorded friction event can open a proactive ticket in your IT service management domain.

Recommended: b. The flagship DEM and DEX tools all wire detected friction into proactive ticketing and remediation rather than letting it sit: Catchpoint feeds its signals into self-healing pipelines (the LogicMonitor Edwin AI integration that "explains alarms, predicts incidents, and automates fixes"), and the DEX leaders (Nexthink, ControlUp, Aternity) all pair friction detection with automated remediation or a service-desk handoff. Authoring the proactive-ticket handoff puts the event to use rather than discarding signal, and it is the additive option. Deleting the event is destructive, so either way this needs your sign-off.

a6:

---

## Optional (will not hold up the build)

q7: A vendor-surface scan confirms eight deeper objects across the flagship DEM tools (synthetic monitor definitions, probe / monitoring locations, page-load events, web vitals, performance baselines, SLA-compliance records, device-health summaries, application-response traces). Should I research and add the ones that hold up? (yes/no)

Recommended: yes for the six DEM-owned objects, defer the two boundary objects. Six are squarely Core/Common on the DEM surface: synthetic monitor definitions and probe locations (Catchpoint enumerates 685+ nodes and 18 test types; ThousandEyes, Datadog, and Dynatrace all ship the monitor definition as a first-class object separate from the per-run result), page-load events and web vitals (Datadog auto-collects Core Web Vitals per session; Dynatrace and New Relic ship page-level RUM), performance baselines (Catchpoint's smart baselines, Dynatrace's Davis baselining), and SLA-compliance records (uptime/SLO rollups in Catchpoint, ThousandEyes, Datadog). The other two are cross-boundary per the Phase 0 study: device-health summaries belong to the DEX market (Nexthink, ControlUp, Lakeside master per-device CPU/memory/battery rollups), so hold them until q2 settles, and application-response traces belong to runtime Application Performance Monitoring (Datadog APM, Dynatrace APM, New Relic APM, AppDynamics), so hold them until q8 settles. Additive and can happen after the modules exist.

a7:

---

q8: Should I queue a separate Application Performance Monitoring domain (the Datadog APM / Dynatrace APM / New Relic APM / AppDynamics category), distinct from the existing Application Portfolio Management domain that already uses a similar code? (yes/no)

Recommended: yes, as a candidate to triage later. Runtime APM is its own market: Datadog, Dynatrace, and New Relic all sell APM (app-internal distributed tracing, code-level spans, service maps) as a distinct product line from their DEM/RUM surface, and AppDynamics, Elastic APM, Honeycomb, and Instana are pure-plays in it. It would own the application-response-trace object from q7 and keep that market from being conflated with DEM. Note the existing catalog code APM is Application Portfolio Management (LeanIX, Ardoq), a different market, so the new domain needs a distinct code. Additive and non-blocking.

a8:

---

<!-- agent map, ignore: q1=B2-MODULE-SPLIT q2=B2-DEX-BOUNDARY q3=B2-PATTERN-FLAGS.rum q4=B2-PATTERN-FLAGS.friction q5=B2-PATTERN-FLAGS.scores q6=B1A-B9-ORPHAN q7=B3-MARKET-ENTITIES q8=B3-APM-MONITORING | domain_id=83 | phase0=.tmp_deploy/DEM-phase0-2026-06-08.md | reversed: B2-DEX-BOUNDARY c->b -->
