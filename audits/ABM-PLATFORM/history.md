# ABM-PLATFORM (Account-Based Marketing Platform) - audit history

## 2026-06-15 - Domain promoted and built

ABM-PLATFORM was promoted from a queued candidate (`audits/_missing-domains.md`, surfaced by the GTM-PLAN audit, decision D3 / B2-S2) to a live domain, on the user's "promote both now" approval while processing the GTM-PLAN a-file (a5 = b: promote ABM as the downstream engagement consumer, keep ICP/lists in GTM-PLAN). Phase 0: `.tmp_deploy/ABM-PLATFORM-phase0-2026-06-15.md`. Loader: `.tmp_deploy/build_abm_2026_06_15.ts`.

Built (all `record_status='new'`):
- **domains** row ABM-PLATFORM (id 185), 7 metadata fields (crud 55, min_org_size `20 s <500`, cost_band `$$$`, cert false, US TAM 1200 / 2025), buyer-voice catalog copy.
- **4 full modules**: ABM-INTENT (394), ABM-ENGAGEMENT-ORCHESTRATION (395), ABM-ADVERTISING (396), ABM-WEB-PERSONALIZATION (397).
- **6 capabilities** (new): ABM-INTENT-DATA, ABM-ACCOUNT-IDENTIFICATION, ABM-ENGAGEMENT-SCORING, ABM-ENGAGEMENT-ORCHESTRATION, ABM-ADVERTISING, ABM-WEB-PERSONALIZATION. 7 domain_module_capabilities.
- **12 masters**: intent_signals, account_identifications, account_engagement_scores, consent_records (ABM-INTENT); abm_campaigns, account_journeys, orchestration_playbooks (ABM-ENGAGEMENT-ORCHESTRATION); ad_campaign_targets, content_syndication_programs (ABM-ADVERTISING); web_personalization_rules, web_experiences, web_visitor_resolutions (ABM-WEB-PERSONALIZATION). 14 lifecycle states on the 4 operational_workflow masters. Contact-level masters (intent_signals, account_identifications, account_engagement_scores, consent_records, web_visitor_resolutions) flagged has_personal_content.
- **Collision resolutions (single-master rule):** `audience_segments` (CDP-mastered), `data_subject_requests` (ATS-mastered), `ad_audiences` (SOCIAL-ADS-mastered) taken as `embedded_master` (standalone shells deferring to the canonical owners). `engagement_scores` is REV-INTEL's (sales-activity engagement, a distinct concept), so ABM masters its own `account_engagement_scores` instead (Rule #9 collision-prefix).
- **3 consumer rows from GTM-PLAN**: ideal_customer_profiles (1220), target_account_lists (1221), account_scores (1222) - ABM ingests, GTM-PLAN authors. Plus 2 GTM-PLAN -> ABM handoffs (target_account_list.approved, ideal_customer_profile.updated) into ABM-ENGAGEMENT-ORCHESTRATION.
- **6 flagship solutions** linked primary (Demandbase One, 6sense Revenue AI, Madison Logic Platform, RollWorks, Terminus, Mutiny); 5 vendors created, Demandbase reused.
- **Phase C**: Marketing (owner), Sales (contributor).
- **Phase S**: abm-platform-system skill (domain-grain) + 7 tools, 7 domain_module_tools.

Deferred follow-ups (b1b, not blocking; surfaced in q-ABM-PLATFORM.md): Phase-P personas (E1), more cross-domain handoffs (CI/intent toward CRM/REV-INTEL; CRM opportunity context), data_object_aliases, broader tools, and `domain_regulations` for GDPR/CPRA (CPRA exists as id 3; GDPR would be a new regulation row - expansive, surfaced not auto-loaded). The _missing-domains.md ABM-PLATFORM candidate entry is now satisfied (clean up on the next missing-domains pass).