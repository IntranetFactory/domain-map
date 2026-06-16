# PMM (Product Marketing Management) - audit history

## 2026-06-15 - Domain promoted and built

PMM was promoted from a queued candidate (`audits/_missing-domains.md`, mention count 2: GTM-PLAN + PROD-MGMT) to a live domain, on the user's "promote both now" approval while processing the GTM-PLAN and PROD-MGMT a-files. Phase 0: `.tmp_deploy/PMM-phase0-2026-06-15.md`. Loader: `.tmp_deploy/build_pmm_2026_06_15.ts`.

Built (all `record_status='new'`):
- **domains** row PMM (id 184), all 7 metadata fields populated (crud 80, min_org_size `20 s <500`, cost_band `$$`, cert false, US TAM 900 / 2024), plus buyer-voice catalog copy.
- **4 full modules**: PMM-COMPETITIVE-INTEL (385), PMM-LAUNCH-MGMT (386), PMM-MESSAGING (387), PMM-SALES-ENABLEMENT (388).
- **7 capabilities RELOCATED** in (capability_domains re-pointed to PMM): LAUNCH-ORCHESTRATION (109, from GTM-PLAN) + LAUNCH-PLANNING (119), GTM-LAUNCH-COORDINATION (120), MESSAGING-AND-POSITIONING (121), SALES-ENABLEMENT-CONTENT (122), COMPETITIVE-INTELLIGENCE (123), WIN-LOSS-INTERVIEWS (124) (from PROD-MGMT). 7 domain_module_capabilities.
- **17 masters** across the 4 modules (competitive_intelligence_records, battlecards, competitor_profiles, intel_sources, win_loss_interviews; launch_plans, product_launches, launch_milestones, readiness_checklists, launch_activities; messaging_frameworks, persona_definitions, value_propositions; sales_enablement_content, content_collections, enablement_trainings, content_engagement_events). win_loss_interviews + content_engagement_events flagged has_personal_content (GDPR/CPRA, no compliance entity needed). 24 lifecycle states on the 6 operational_workflow masters.
- **5 flagship solutions** linked primary (Klue, Crayon, Highspot, Seismic, Aha! Roadmaps); Klue/Crayon/Highspot vendors created, Aha!/Seismic reused.
- **Phase C**: Marketing (owner), Product Management (contributor), Sales (consumer).
- **Phase S**: pmm-system skill (domain-grain) + 10 query/mutate tools + notify_team, 11 domain_module_tools.

Deferred follow-ups (b1b, not blocking; surfaced in q-PMM.md): Phase-P personas (4-module domain, E1), cross-domain handoffs (inbound product.launch_scheduled from PROD-MGMT PM-ROADMAP-DELIVERY, which PROD-MGMT's B9 owes; CI / win-loss feeds toward CRM and REV-INTEL), data_object_aliases (B11), and broader domain_module_tools. The _missing-domains.md PMM candidate entry is now satisfied (clean up on the next missing-domains pass).