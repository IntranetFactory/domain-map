# GTM-PLAN Phase 0 — Vendor Surface

Domain: Go-to-Market Planning. Owner = Sales Operations; contributors = Marketing, Product Management. Currently 0 modules / 0 masters. 8 capabilities: MARKET-SEGMENTATION, TERRITORY-CARVING-PLAN, ACCOUNT-SCORING, GTM-CAPACITY-PLANNING, CHANNEL-MIX-PLANNING, LAUNCH-ORCHESTRATION, GTM-SCENARIO-MODELING, PLAN-TO-EXECUTION-HANDOFF.

This is a market-shape pass. The verdicts below are driven by how named flagship vendors actually package these surfaces, not by build convenience.

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| Anaplan (Sales Planning) | anaplan.com | Granular connected planning: separate apps for Account Segmentation, Territory & Quota, Sales Capacity, Crediting, Incentive Comp | Reference granular planner; explicit per-capability app decomposition |
| Pigment | pigment.com | RevOps/SPM planning: capacity, territory & quota, scenario modeling | Modern granular planner; tests whether per-capability surfaces are exposed |
| Fullcast | fullcast.com | RevOps "plan-to-pay": territory design, quota, capacity, routing, plan-to-execution | CRM-adjacent platform that unifies plan + execution handoff |
| Salesforce Sales Planning | salesforce.com | CRM-native segmentation + territory carving + quota allocation + collaboration | CRM-native collapse case; tests fewer-module hypothesis |
| Varicent | varicent.com | Sales planning + ICM/SPM | SPM incumbent; sales-planning module adjacent to commissions |
| Klue / Crayon | klue.com / crayon.co | Competitive intelligence + product-launch support, PMM buyer | Launch-orchestration / PMM market test (D2) |
| Aha! (Roadmaps/Launch) | aha.io | Cross-functional product launch orchestration, PM/PMM buyer | Launch orchestration as a PM-owned surface (D2) |
| Demandbase / 6sense | demandbase.com / 6sense.com | ABM: ICP, account scoring, intent, ad targeting, web personalization | ABM platform promotion test (D3, D5) |
| RollWorks / Madison Logic / Terminus | rollworks.com / madisonlogic.com / terminus.com | ABM engagement + intent | ABM market breadth (D3) |
| HubSpot Marketing Hub / SFMC Account Engagement | hubspot.com / salesforce.com | Marketing automation, ABM-on-a-budget, campaign/budget allocation | Channel-mix-as-MA-budget case (D5) |

## Surface matrix

Vendor columns: AN=Anaplan, PG=Pigment, FC=Fullcast, SF=Salesforce Sales Planning, VC=Varicent, DB=Demandbase/6sense (ABM), KL=Klue/Crayon/Aha! (launch/PMM).

| Entity | Category | AN | PG | FC | SF | VC | DB | KL | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| market_segments | Master | x | x | x | x | x | x |  | Core | planning_core |
| ideal_customer_profiles | Master | x | x | x | x |  | x |  | Core | planning_core |
| target_account_lists | Master | x | x | x | x |  | x |  | Core | planning_core |
| account_scores | Master | x | x | x | x | x | x |  | Core | planning_core |
| account_score_models | Config | x | x |  |  | x | x |  | Common | planning_core |
| territories | Master | x | x | x | x | x |  |  | Core | territory_quota |
| territory_assignments | Junction | x | x | x | x | x |  |  | Core | territory_quota |
| territory_balance_metrics | Junction | x | x | x | x |  |  |  | Core | territory_quota |
| quotas | Master | x | x | x | x | x |  |  | Core | territory_quota |
| quota_allocations | Junction | x | x | x | x | x |  |  | Core | territory_quota |
| coverage_models | Config | x | x | x | x |  |  |  | Core | gtm_capacity |
| capacity_plans | Master | x | x | x |  | x |  |  | Core | gtm_capacity |
| ramp_curves | Config | x | x | x |  | x |  |  | Core | gtm_capacity |
| hiring_plans | Master | x | x | x |  |  |  |  | Core | gtm_capacity |
| productivity_assumptions | Config | x | x | x |  | x |  |  | Core | gtm_capacity |
| channel_mix_plans | Master | x | x |  |  |  | x |  | Common | channel_mix |
| channel_budget_allocations | Junction | x | x |  |  |  | x |  | Common | channel_mix |
| gtm_scenarios | Master | x | x | x | x | x |  |  | Core | scenario_modeling |
| scenario_assumptions | Config | x | x | x |  | x |  |  | Core | scenario_modeling |
| scenario_comparisons | Junction | x | x | x | x |  |  |  | Core | scenario_modeling |
| plan_versions | Master | x | x | x | x | x |  |  | Core | scenario_modeling |
| launch_plans | Master |  |  |  |  |  |  | x | Specialist | launch_orchestration |
| launch_milestones | Junction |  |  |  |  |  |  | x | Specialist | launch_orchestration |
| launch_readiness_checklists | Config |  |  |  |  |  |  | x | Specialist | launch_orchestration |
| competitive_battlecards | Config |  |  |  |  |  |  | x | Specialist | launch_orchestration |
| plan_approvals | Audit | x | x | x | x |  |  |  | Core | exec_handoff |
| plan_lock_records | Audit | x | x | x | x |  |  |  | Core | exec_handoff |
| execution_handoff_payloads | Junction | x |  | x | x |  |  |  | Common | exec_handoff |
| crm_sync_records | Junction |  |  | x | x |  | x |  | Common | exec_handoff |
| intent_signals | Engagement |  |  |  |  |  | x |  | Specialist | (ABM, downstream) |
| web_personalization_rules | Config |  |  |  |  |  | x |  | Specialist | (ABM, downstream) |
| ad_campaign_targets | Engagement |  |  |  |  |  | x |  | Specialist | (ABM, downstream) |

## Compliance entities (non-optional)

| Entity | Regulation | Proposed module | Note |
| --- | --- | --- | --- |
| (none mandatory) | GDPR / CCPA | n/a (downstream ABM) | GTM-PLAN as a planning shell masters cohort-level segments, ICPs, and named-account lists, not contact-level PII. The contact-level intent surface (`intent_signals`, person-level scoring) that triggers GDPR/CCPA exposure lives in Demandbase/6sense, i.e. the downstream ABM engagement system, not in the planning domain. Honest verdict: do NOT tag GTM-PLAN with consent/SAR entities. If `account_scores` ever ingests EU/US contact-level intent, the exposure moves with that data into ABM-PLATFORM, where `gdpr_consent_records` / `subject_access_requests` belong. |

## Modularization hypothesis

Six modules, each with >=1 master, matching the natural vendor seams:
1. **planning_core** (masters: market_segments, ideal_customer_profiles, target_account_lists, account_scores) — segmentation + ICP + named-list + scoring, the "who do we sell to" layer every vendor co-locates.
2. **territory_quota** (masters: territories, quotas) — carving and quota allocation; the single most universal planner surface.
3. **gtm_capacity** (masters: capacity_plans, hiring_plans) — coverage, ramp, productivity, headcount.
4. **channel_mix** (master: channel_mix_plans) — budget/channel allocation; thin and contested (see D5).
5. **scenario_modeling** (masters: gtm_scenarios, plan_versions) — what-if and versioning across the above.
6. **exec_handoff** (masters: plan_lock_records; junction execution_handoff_payloads) — lock, approve, push to CRM/SPM.
LAUNCH-ORCHESTRATION (launch_plans + milestones + battlecards) is held separately pending D2 — no granular planner masters it; only the PMM/CI/PM tools do.

## Per-decision verdicts (D1-D5)

**D1 (module shape): 5 modules, not 8 and not 3.** The granular planners do NOT expose all 8 capabilities as separate per-capability products: Anaplan ships discrete apps (Account Segmentation, Territory & Quota, Sales Capacity, Crediting, Incentive Comp), proving territory+quota travel together as ONE app and capacity as ANOTHER, but it does not split market-segmentation, ICP, and account-scoring into three products — they are one segmentation app. Pigment likewise bundles territory+quota and treats capacity and scenario modeling as planning surfaces within one platform, not separable SKUs. The CRM-native ones genuinely collapse: Salesforce Sales Planning is a single product whose tabs are Segment/Hierarchy, Territory Carving, Quota Allocation, and Collaboration; Fullcast unifies plan + handoff in one "plan-to-pay" surface. So 8 over-splits (no vendor sells segmentation, ICP, and scoring as three products), and 3 under-splits (it would fuse capacity with scenario against Anaplan's explicit app boundary). The vendor-grounded shape is planning_core + territory_quota + gtm_capacity + scenario_modeling + exec_handoff, with channel_mix and launch_orchestration decided by D5/D2.

**D2 (PMM promotion): promote PMM and relocate LAUNCH-ORCHESTRATION.** None of the GTM-planning vendors (Anaplan, Pigment, Fullcast, Salesforce, Varicent) master launch plans, launch milestones, readiness checklists, or battlecards — these surfaces are absent from their products entirely. They are mastered by a distinct market with a distinct buyer: Klue and Crayon (competitive intelligence / launch support, voted by the Product Marketing Alliance, PMM-bought), and Aha! (cross-functional product-launch orchestration, PM/PMM-bought). Highspot/Seismic are enablement-adjacent (content + training delivery), confirming launch sits in a PMM/PM neighborhood, not the Sales-Ops/RevOps planning neighborhood. The buyer split is clean (PMM lead vs. Sales-Ops), so LAUNCH-ORCHESTRATION is not a feature the GTM-planning vendors carry; promote a PMM domain and move launch_plans/milestones/checklists/battlecards there.

**D3 (ABM-PLATFORM promotion): promote ABM-PLATFORM as the downstream engagement consumer; keep ICP + target-lists + planning-side scoring in GTM-PLAN.** There is a clean planning-vs-engagement cut and the vendors draw it themselves. Demandbase and 6sense DO model ICP-definition, target-account-lists, and account scoring, with a Marketing-Ops buyer — but their differentiator is engagement: 6sense's predictive intent ("in-market before they raise their hand"), Demandbase's 2T+ monthly signals, ad targeting, and web personalization. The planning side (ICPs, named account lists authored once per planning cycle, segment-level scoring) is also natively present in Anaplan, Pigment, Fullcast, and Salesforce Sales Planning, which proves it belongs to GTM-PLAN. The engagement entities (`intent_signals`, `web_personalization_rules`, `ad_campaign_targets`, contact-level scoring) sit ONLY on the ABM side. Verdict: GTM-PLAN authors ideal_customer_profiles + target_account_lists + planning-grade account_scores; ABM-PLATFORM ingests those and runs engagement. Promote ABM-PLATFORM owning intent/ad/personalization, NOT owning the planning-side ICP authoring.

**D4 (SALES-PLANNING-PLATFORM promotion): do NOT promote on the strength of the Gartner claim — the claim is unverified.** I could not confirm a standalone Gartner "Sales Planning Platforms" Magic Quadrant or Market Guide for 2024-2025. What Gartner actually publishes is the Market Guide / MQ for Sales Performance Management (which explicitly contains territory planning and quota planning) plus the xP&A Market Guide (where Anaplan is placed). So the asserted distinct named category is not substantiated by available evidence; treat the premise as false until a Gartner document title is produced. That said, the market behavior is real: Anaplan, Pigment, Fullcast, Salesforce, and Varicent DO compete as a sales-planning cluster with a RevOps-strategy buyer that is distinct from SALES-PERF's commissions buyer (Anaplan and Varicent sell Incentive Comp as a SEPARATE app from Territory & Quota, confirming the buyer split from commissions). The honest recommendation: keep TERRITORY-CARVING-PLAN, GTM-CAPACITY-PLANNING, and GTM-SCENARIO-MODELING inside GTM-PLAN for now (they are the cross-functional Sales-Ops planning core), and do not carve out a SALES-PLANNING-PLATFORM domain on a category that cannot be cited. Revisit only if the Gartner title surfaces.

**D5 (channel-mix scope): split — keep coverage/capacity channel modeling in GTM-PLAN; relocate paid-channel budget allocation to MA/ABM.** There is no clean pure-play for "channel-mix planning"; the surface is claimed three ways by three different buyers. Anaplan and Pigment model channel mix inline with plan modeling as a sales-ops coverage decision (which routes/channels carry which segments). Demandbase/6sense treat channel allocation as ABM engagement spend (ad targeting budget by account tier), a marketing-ops decision. HubSpot Marketing Hub and Salesforce Marketing Cloud Account Engagement treat it as marketing-automation campaign/budget allocation with ROI dashboards. Because the entity bifurcates by buyer, GTM-PLAN should keep the planning-grade channel_mix_plans (coverage-model channel choice, owned by Sales-Ops) and let the paid-media/campaign budget allocation live in MA / the promoted ABM-PLATFORM. Verdict: split, with GTM-PLAN retaining the thin strategic channel-mix master and the spend-execution allocation relocating downstream.

## Subtraction-list notes for Phase A

- Core/Common entities (planning_core, territory_quota, gtm_capacity, scenario_modeling, exec_handoff) load by default.
- channel_mix_plans / channel_budget_allocations: load the planning-grade master only; spend allocation deferred to MA/ABM (D5).
- launch_* and competitive_battlecards: do NOT load into GTM-PLAN; route to promoted PMM domain (D2).
- intent_signals / web_personalization_rules / ad_campaign_targets: do NOT load into GTM-PLAN; route to promoted ABM-PLATFORM (D3).
- No compliance entities load into GTM-PLAN (planning shell, cohort-level data only); GDPR/CCPA exposure travels with contact-level intent into ABM-PLATFORM.
