# DAP — Digital Adoption Platform (audit history)

## 2026-06-16 — Scoping + Phase 0 (candidate, unbuilt)

DAP is not in the live catalog. This pass scoped it as a domain candidate and ran Phase 0 vendor-surface research. No catalog rows were written.

**Classification.** DAP passes the point-solution-market test: six pure-play flagships sell a product built around overlaying guidance on top of existing apps (WalkMe, Whatfix, Pendo, Userpilot, Appcues, Userlane; plus Chameleon, Gainsight PX). The defining artifact is a live in-app overlay (walkthroughs, tooltips, checklists, microsurveys), and the buyer is the product / customer-success / PLG team (customer-facing) or IT enablement (employee-facing). Distinct from Employee Onboarding (HR journey), LMS (graded out-of-app courseware), and CSM (service cases).

**Backlog.** Registered in `audits/_missing-domains.md` (## Pending review, "DAP — Digital Adoption Platform") via `append_missing_domain.ts`.

**Phase 0.** Report at `.tmp_deploy/DAP-phase0-2026-06-16.md`. Six flagship vendors surveyed. Surface: 28 Core entities (21 present in all six vendors). Modularization hypothesis: four full modules, guidance_authoring (master walkthroughs), engagement_feedback (master onboarding_checklists), targeting_segmentation (master user_segments), and adoption_analytics (master feature_events, flagged as the extraction candidate). Collision-safe neutral names verified live: `user_segments` (audience_segments is marketing/CDP-owned), `microsurveys` / `in_app_survey_responses` (survey_responses is EMP-EXP-owned), `session_replays` (session_recordings is remote-support-owned), `tracking_consent_records` (consent_records / gdpr_consent_records already claimed).

**Compliance/privacy (light).** DAP is largely unregulated. Three real-but-light entities from injecting behavioral tracking + overlays: `tracking_consent_records` (GDPR/CCPA tracking opt-in), `data_subject_requests` (DSAR/deletion), `accessibility_conformance_records` (WCAG/ADA for injected UI). A floor, not a SOX/HIPAA regime.

**Boundary verdicts (Phase 0).** ONBOARDING (99): handoff/consumer, NOT master, DAP delivers the learn-the-tools slice; ONBOARDING owns new-hire journeys. KMS (33, unbuilt stub): resource_centers embed/consume knowledge_articles, do not re-master. SOP-MGMT (sibling candidate): DAP masters the in-app overlay; SOP-MGMT masters the published document; Scribe/Tango straddle (capture once, publish as doc or push as overlay) modeled as a consumer edge. EMP-EXP (62): DAP microsurveys are product-feedback (NPS/CES on a feature), no master overlap with employee-engagement surveys. LMS (57): different modality, no overlap. DXP (77) / DEM (83) / CSM (30): clean separation.

**Product-Analytics coupling.** feature_events / funnels / paths / retention_cohorts / goals are genuinely shared with an unbuilt Product-Analytics market (Amplitude, Mixpanel). Pendo proves the DAP+analytics fusion is real. Phase 0 recommends keeping adoption_analytics in DAP for now, flagged for extraction; when a Product-Analytics domain is built, the deep engine re-homes there and DAP keeps flow_engagement_stats. Surfaced as B2-DAP-ANALYTICS-SPLIT.

**Audience.** Employee-facing vs customer-facing is an audience tag on shared entities (every core entity is identical in shape across audiences; WalkMe/Userlane internal, Appcues/Userpilot product, Whatfix/Pendo both), not two domains. Surfaced as B2-DAP-AUDIENCE.

**Open decisions (q-DAP.md).** Four `b2` calls: promote (gate), scope boundary (master-vs-consume + four modules + the SOP-MGMT capture seam), adoption-analytics module in-scope vs defer to Product-Analytics, and audience tag vs two-domain split.

Left `feedback_needed`; nothing written to the catalog.
