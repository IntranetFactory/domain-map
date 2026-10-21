# PROD-ANALYTICS Phase 0 — Vendor Surface (Product Analytics)

Research only. No inserts proposed. Catalog collisions verified live 2026-06-16.

Market: software that instruments a digital product, captures behavioral events, and analyzes in-product behavior (feature usage, funnels, retention/cohorts, user paths, behavioral segmentation), often bundling experimentation and session replay. Buyer: PM / growth / PLG / data team.

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| Amplitude | amplitude.com | Behavioral product analytics at enterprise scale; Experiment + Session Replay add-ons | Category leader; widest first-party surface (events, charts, cohorts, journeys, experiment, replay) |
| Mixpanel | mixpanel.com | Event-based product analytics, self-serve reports | Canonical pure-play; clean events/reports/funnels/cohorts/boards model |
| PostHog | posthog.com | Open-source all-in-one product OS (analytics + flags + experiments + replay + surveys) | Pure-play; exposes both scope seams (it bundles experiments AND replay) |
| Heap | heap.io | Autocapture analytics (retroactive event definitions) | Pure-play; the autocapture/event-definition model differs from manual tracking, widens surface |
| June | june.so | B2B SaaS product analytics, auto-generated reports | Diversity pick; lean PLG surface confirms the Core nouns |
| Pendo | pendo.io | Product analytics fused with digital adoption (guidance) | Straddles PA + DAP; included to expose the DAP/CDP seams |

Kubit (warehouse-native PA), Statsig (experiment-led), Optimizely, LaunchDarkly, FullStory, Hotjar, Contentsquare evaluated as seam evidence below; surface is covered by the six columns.

## Surface matrix

Presence: x = present, embed = embedded/consumed not mastered. AM=Amplitude, MP=Mixpanel, PH=PostHog, HE=Heap, JU=June, PE=Pendo.
All proposed names verified collision-free unless noted.

| Entity | Category | AM | MP | PH | HE | JU | PE | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| events | Master records | x | x | x | x | x | x | Core (6) | instrumentation |
| event_properties | Configuration/templates | x | x | x | x | x | x | Core (6) | instrumentation |
| event_definitions | Configuration/templates | x | x | x | x | - | x | Core (5) | instrumentation |
| tracking_plans | Configuration/templates | x | x | x | x | - | - | Core (3) | instrumentation |
| event_sources | Configuration/templates | x | x | x | x | x | x | Core (6) | instrumentation |
| identified_users | Master records | x | x | x | x | x | x | Core (6) | instrumentation |
| user_properties | Configuration/templates | x | x | x | x | x | x | Core (6) | instrumentation |
| sessions | Master records | x | x | x | x | x | x | Core (6) | instrumentation |
| feature_events | Junctions/transitions | x | x | x | x | x | x | Core (6) | instrumentation |
| identity_merges | Junctions/transitions | x | x | x | x | - | - | Core (3) | instrumentation |
| funnels | Master records | x | x | x | x | x | x | Core (6) | analysis |
| funnel_steps | Junctions/transitions | x | x | x | x | x | x | Core (6) | analysis |
| retention_cohorts | Master records | x | x | x | x | x | x | Core (6) | analysis |
| user_paths | Master records | x | x | x | x | - | x | Core (5) | analysis |
| behavioral_cohorts | Master records | x | x | x | x | x | x | Core (6) | analysis |
| saved_reports | Master records | x | x | x | x | x | x | Core (6) | analysis |
| dashboards | Master records | x | x | x | x | x | x | Core (6) | analysis |
| dashboard_charts | Junctions/transitions | x | x | x | x | x | x | Core (6) | analysis |
| metrics | Configuration/templates | x | x | x | x | x | x | Core (6) | analysis |
| goals | Master records | x | x | x | x | x | x | Core (6) | analysis |
| annotations | Engagement/outreach | x | x | x | x | - | x | Core (5) | analysis |
| alerts | Engagement/outreach | x | x | x | x | - | x | Core (5) | analysis |
| user_segments | Master records | x | x | x | x | x | x | Core (6) | segmentation |
| segment_memberships | Junctions/transitions | x | x | x | x | - | x | Core (5) | segmentation |
| segment_rules | Configuration/templates | x | x | x | x | x | x | Core (6) | segmentation |
| audience_syncs | Junctions/transitions | x | x | x | - | - | x | Core (3) | segmentation |
| experiments | Master records | x | - | x | - | - | x | Common (3) | experimentation (CONDITIONAL) |
| experiment_variants | Junctions/transitions | x | - | x | - | - | x | Common (3) | experimentation (CONDITIONAL) |
| experiment_assignments | Junctions/transitions | x | - | x | - | - | x | Common (3) | experimentation (CONDITIONAL) |
| feature_flags | Configuration/templates | x | - | x | - | - | - | Common (2) | experimentation (CONDITIONAL) |
| metric_lifts | Junctions/transitions | x | - | x | - | - | - | Specialist (2) | experimentation (CONDITIONAL) |
| session_replays | Master records | x | - | x | - | - | x | Common (3) | session_analytics (CONDITIONAL) |
| replay_events | Junctions/transitions | x | - | x | - | - | - | Specialist (1) | session_analytics (CONDITIONAL) |
| heatmaps | Master records | - | - | x | - | - | - | Specialist (1) | session_analytics (CONDITIONAL) |
| data_exports | Junctions/transitions | x | x | x | x | - | x | Core (5) | instrumentation |

Naming notes (verified live 2026-06-16):
- `audience_segments` is already mastered (id 113, marketing/CDP cohorts). PA uses `user_segments` (free; matches DAP's name, see single-master verdict) plus `behavioral_cohorts` for query-defined groups.
- `survey_responses` is already mastered by EMP-EXP (id 182). PA does not master surveys; if a PA vendor ships surveys (PostHog), classify as out-of-scope / consume.
- `session_recordings` is mastered by a remote-support domain (id 239). PA uses `session_replays` (free; matches DAP's neutral name).
- `events`, `sessions`, `funnels`, `experiments`, `dashboards`, `feature_events`, `usage_funnels`, `user_paths`, `retention_cohorts`, `goals`, `user_segments`, `tracking_plans`, `event_properties` all verified collision-free.
- Used `funnels` over DAP's `usage_funnels`: PA is the canonical funnel master, so it gets the bare word; DAP consumes.

## Compliance entities (non-optional, but light)

PA is largely unregulated but instruments behavioral tracking of identified end-users, so privacy is real. Vendors expose consent toggles, data-deletion APIs, and residency choices, not a regulator-filing regime. Keep honest and short.

| Entity | Regulation | Proposed module |
| --- | --- | --- |
| tracking_consent_records | GDPR Art. 6/7, CCPA/CPRA (opt-in/opt-out for behavioral event capture) | instrumentation |
| data_subject_requests | GDPR DSAR / CCPA access + deletion (end-user PII in events + user_properties) | instrumentation |
| data_deletion_requests | GDPR right-to-erasure / CCPA deletion (per-user event purge) | instrumentation |
| data_residency_configs | GDPR/Schrems II data-locality (EU vs US ingestion regions) | instrumentation |

`tracking_consent_records` chosen (generic `consent_records`/`gdpr_consent_records` claimed elsewhere; matches DAP). These four are the floor, not a SOX/HIPAA regime.

## Modularization hypothesis

Core (always-on) is two modules; two more are CONDITIONAL on the scope-seam decisions below. Rule #14 satisfied: each module has >=1 master; domain has >=3 capabilities so >=2 full modules required (instrumentation + analysis already meet that even if both conditional modules are dropped).

1. **instrumentation** (master: events) — the event-collection + identity substrate: events, event_properties, event_definitions, tracking_plans, event_sources, identified_users, user_properties, sessions, feature_events, identity_merges, data_exports, plus all four privacy entities. This is "capture and govern the event stream." Mandatory.

2. **analysis** (master: funnels) — the behavioral-analysis surface: funnels + funnel_steps, retention_cohorts, user_paths, behavioral_cohorts, saved_reports, dashboards + dashboard_charts, metrics, goals, annotations, alerts. This is "ask questions of the stream." Mandatory.

3. **segmentation** (master: user_segments) — user_segments, segment_memberships, segment_rules, audience_syncs. Who is grouped and where groups are pushed. Could fold into analysis if thin in Phase A, but the activation/sync edge to CDP/marketing argues for a distinct module.

4. **experimentation** (master: experiments) — CONDITIONAL: experiments, experiment_variants, experiment_assignments, feature_flags, metric_lifts. Build only if seam decision #1 lands "in-scope" (see verdicts). If out-of-scope, this becomes a separate domain (feature-management / experimentation).

5. **session_analytics** (master: session_replays) — CONDITIONAL: session_replays, replay_events, heatmaps. Build only if seam decision #2 lands "in-scope." Otherwise a separate experience-analytics domain owns it; PA consumes/links.

## Boundary verdicts

For each adjacent domain: what PA masters vs consumes/embeds/hands-off.

- **BI (Business Intelligence and Analytics, id 74)** — PA masters its own event/user/session data model and purpose-built behavioral analysis (funnels, retention, paths, cohorts). BI masters generic dashboards/governed self-service over MODELED warehouse data. Amplitude/Mixpanel exist independently of Tableau/Power BI/Looker. **Verdict: distinct, NO master overlap.** PA's `dashboards`/`saved_reports` are behavioral-analytics views, not BI's governed semantic-layer dashboards. Recommendation: model a consumer/handoff edge where PA EXPORTS aggregated events/metrics to BI (and to a warehouse); do not let BI claim PA's behavioral entities, and do not let PA re-master BI's governed dashboards.

- **PROD-MGMT (Product Management, id 101)** — PROD-MGMT CONSUMES product-analytics signals (feature usage feeding prioritization/roadmaps); it does not instrument or master the event stream. **Verdict: handoff/consumer, NOT master.** Recommendation: PA masters events/feature_events/funnels/goals; PROD-MGMT references PA metrics as inputs to roadmap decisions. Keep a clean consumer edge; no shared master.

- **CDP (Customer Data Platform, id 72)** — adjacent and convergent. CDP unifies identity + builds unified profiles + ACTIVATES segments to downstream channels; it PIPES events INTO product analytics. PA's job is analyze. **Verdict on the event/identity-mastering boundary (flag explicitly):** the *unified, cross-channel customer profile and the canonical identity-resolution graph* are CDP-mastered (`audience_segments` id 113 is CDP/marketing). PA masters the *behavioral event stream as observed in-product* and a *product-scoped user record* (`identified_users`) keyed for analysis, plus `identity_merges` for in-product alias stitching. Recommendation: when both domains load together, CDP is the system of record for the master customer profile and for cross-channel `audience_segments`; PA ingests events (often FROM the CDP) and masters the product-behavioral event store and product-analytics `user_segments`/`behavioral_cohorts`. `audience_syncs` is the activation handoff (PA -> CDP/marketing). Do not double-master identity: PA's `identified_users` is a product-analytics projection, not the CDP golden record.

- **DAP (Digital Adoption Platform, candidate; audits/DAP/DAP-phase0-2026-06-16.md)** — DAP's `adoption_analytics` module (feature_events, usage_funnels, user_paths, retention_cohorts, goals, session_replays) was deliberately flagged for extraction INTO PA. **Verdict: PA is canonical master of feature_events, funnels, user_paths, retention_cohorts, goals, session_replays; DAP CONSUMES them and retains only `flow_engagement_stats`** (per-flow completion/drop-off, intrinsic to DAP overlays). Single-master rule M7 reconciliation: use the SAME names so there is one master, not two. Name alignment: PA `funnels` <- DAP's `usage_funnels` (PA gets bare word; DAP's `usage_funnels` should be re-pointed to consume PA `funnels`, or renamed at DAP load); `feature_events`, `user_paths`, `retention_cohorts`, `goals`, `session_replays` are shared verbatim. **`user_segments` tension:** DAP currently lists `user_segments` as a master in its `targeting_segmentation` module; PA also needs `user_segments`. Recommendation: PA masters `user_segments`/`behavioral_cohorts`; DAP's audience targeting either consumes PA `user_segments` or keeps a DAP-local `audience_rules`/`tracked_users` substrate and references PA segments. Surface this to the user as the explicit single-master decision; do NOT create two `user_segments` masters.

- **DEM (Digital Experience Monitoring, id 83)** — endpoint/synthetic PERFORMANCE monitoring (page-load, uptime, real-user-monitoring timings). **Verdict: clean separation, NO overlap.** PA's `sessions`/`session_replays` are behavioral (what the user did), not performance telemetry. No edge needed beyond noting both observe the same end-user from different lenses.

### Scope-seam recommendations (do not silently decide)

- **Seam 1 — Experimentation / A-B testing / feature flags:** Evidence is split. Amplitude (Experiment) and PostHog and Pendo bundle experiments; Mixpanel/Heap/June do NOT (only Common, 3/6). LaunchDarkly and Statsig are a *separate* feature-management/experimentation market. **Recommendation: experiments are ADJACENT, not core PA. Model `experimentation` as a CONDITIONAL module that loads only if scope is set wide; otherwise stand up a separate EXPERIMENTATION/feature-flag domain (LaunchDarkly/Statsig/Optimizely) and give PA a consumer edge (experiment exposure logged as `events`; metric_lifts computed on PA's stream).** Default lean: separate domain, because feature_flags belong with feature management, and the strongest pure-plays (Mixpanel/Heap) omit experiments.

- **Seam 2 — Session replay / experience analytics (heatmaps, replay):** Common (3/6) inside PA (Amplitude, PostHog, Pendo add it) but there is a robust standalone experience-analytics market (FullStory, Hotjar, Contentsquare, LogRocket). **Recommendation: session replay is ADJACENT. Model `session_analytics` as a CONDITIONAL module; if scope stays tight, a separate DIGITAL-EXPERIENCE-ANALYTICS domain masters session_replays/heatmaps and PA consumes/links replays from a funnel drop-off.** Use `session_replays` (not `session_recordings`, id 239, remote-support-owned). Default lean: keep replay OUT of PA core, model as separate domain or thin conditional module, since the pure-play market is large and Mixpanel/Heap/June omit it.
