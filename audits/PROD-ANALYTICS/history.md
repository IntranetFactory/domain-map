# PROD-ANALYTICS — Product Analytics (audit history)

## 2026-06-16 — Scoping + Phase 0 (candidate, unbuilt)

PROD-ANALYTICS is not in the live catalog. This pass scoped it as a domain candidate and ran Phase 0 vendor-surface research. The gap was flagged while scoping the DAP candidate (DAP q3 / B2-DAP-ANALYTICS-SPLIT). No catalog rows were written.

**Classification.** PROD-ANALYTICS passes the point-solution-market test: five pure-play flagships (Amplitude, Mixpanel, Heap, PostHog, June; Pendo straddles into DAP) sell a product built around instrumenting a digital product and analyzing in-product behavior. They master their own event/user/session data model and purpose-built funnel/retention/path/cohort analysis, independent of BI vendors (Tableau, Power BI, Looker). Recognized standalone Gartner/G2 category. Buyer is the product / growth / PLG / data team.

**Coverage check (why it is a real gap).** Confirmed live there is no Product Analytics domain. Adjacent but distinct: BI (id 74, generic governed dashboards over warehouse data), PROD-MGMT (id 101, consumes analytics signals), CDP (id 72, identity resolution + activation, pipes events in). No product-analytics capability and no `feature_events` / `funnels` / `cohorts` masters exist (only `onboarding_cohorts`, unrelated).

**Backlog.** Registered in `audits/_missing-domains.md` (## Pending review, "PROD-ANALYTICS — Product Analytics") via `append_missing_domain.ts`.

**Phase 0.** Report at `.tmp_deploy/PROD-ANALYTICS-phase0-2026-06-16.md`. Six flagship vendors surveyed. Surface: 26 Core entities across two mandatory modules + segmentation; experimentation (5 entities) and session replay (3 entities) are Common/Specialist and gated on the two scope seams. Modularization hypothesis: instrumentation (master events), analysis (master funnels), segmentation (master user_segments), plus CONDITIONAL experimentation (master experiments) and session_analytics (master session_replays). Collision-safe neutral names verified live: `user_segments` + `behavioral_cohorts` (audience_segments id 113 is CDP/marketing-owned), no surveys (survey_responses id 182 is EMP-EXP-owned), `session_replays` (session_recordings id 239 is remote-support-owned). PA takes the bare word `funnels` (DAP's usage_funnels consumes it).

**Compliance/privacy (light).** Behavioral-tracking privacy only: `tracking_consent_records` (GDPR/CCPA event-capture consent), `data_subject_requests`, `data_deletion_requests` (per-user event purge), `data_residency_configs`. A floor, not a SOX/HIPAA regime.

**Boundary verdicts (Phase 0).** BI (74): distinct, no master overlap; PA exports aggregates to BI/warehouse. PROD-MGMT (101): handoff/consumer, consumes PA signals, never instruments. DEM (83): clean separation (performance vs behavior). CDP (72): split by lens, CDP masters the unified cross-channel profile + identity graph + audience_segments; PA masters the in-product event stream + product-scoped identified_users + identity_merges; audience_syncs is the PA -> CDP activation handoff; do not double-master identity (surfaced as B2-PA-CDP-IDENTITY). DAP (candidate): PA is canonical master of feature_events / funnels / user_paths / retention_cohorts / goals / session_replays; DAP consumes and keeps only flow_engagement_stats; the user_segments overlap resolves to PA-masters / DAP-consumes (surfaced as B2-PA-DAP-MASTER; coupled to DAP B2-DAP-ANALYTICS-SPLIT + B2-DAP-SCOPE).

**Scope seams.** Experimentation / A-B testing / feature flags (Amplitude Experiment, PostHog, Pendo bundle it; Mixpanel/Heap/June omit; LaunchDarkly/Statsig are a separate feature-management market): default lean separate domain, surfaced as B2-PA-EXPERIMENTATION. Session replay / experience analytics (Amplitude/PostHog/Pendo add it; FullStory/Hotjar/Contentsquare standalone market): default lean separate domain, surfaced as B2-PA-SESSION-REPLAY. Each seam may spawn a further candidate domain.

**Open decisions (q-PROD-ANALYTICS.md).** Five `b2` calls: promote (gate), CDP identity/event boundary, DAP single-master reconciliation, experimentation scope seam, and session-replay scope seam.

Left `feedback_needed`; nothing written to the catalog.
