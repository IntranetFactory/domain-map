# ABM-PLATFORM Phase 0 — Vendor Surface

Domain: Account-Based Marketing Platform. Buyer = Marketing Operations. Promoted out of the GTM-PLAN audit (`audits/_missing-domains.md`, mention count 1, surfaced 2026-05-30; GTM-PLAN Phase 0 decision D3 / B2-S2). Currently 0 modules / 0 masters (new domain).

ABM-PLATFORM is the DOWNSTREAM ENGAGEMENT platform. The PLANNING side stays in GTM-PLAN: ICP authoring (`ideal_customer_profiles`), named/target account-list authoring (`target_account_lists`), and planning-grade account scoring. ABM-PLATFORM does NOT master those; it INGESTS them and runs engagement. This cut is the vendors' own seam: Demandbase/6sense model ICP/list/score for planning, but differentiate on intent, ad targeting, web personalization, and contact-level engagement, the engagement-only surface ABM-PLATFORM owns.

This is a market-shape pass. Verdicts below are driven by how the named flagship vendors actually package the engagement surface, not by build convenience.

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| Demandbase | demandbase.com | Full ABM/ABX platform: intent (2T+ monthly signals), account identification, B2B advertising DSP, web/site personalization, engagement scoring, account journeys | True flagship. Broadest engagement surface; native DSP and intent graph |
| 6sense | 6sense.com | Predictive intent + account identification ("in-market before they raise their hand"), engagement orchestration, B2B advertising, conversational/web personalization | True flagship. Predictive-intent leader; pairs intent with multichannel engagement |
| Madison Logic | madisonlogic.com | Multichannel ABM activation: content syndication, display, social, ABM measurement; intent-fueled (Bombora-anchored) journey acceleration | Flagship-tier on the advertising/activation axis; strongest content-syndication surface |
| RollWorks (NextRoll) | rollworks.com | ABM advertising + sales-touch orchestration for mid-market; account scoring, audience segmentation, programmatic display/social ads | Mid-market ABM-advertising specialist; tests the advertising-centric packaging and the lower `min_org_size` floor |
| Terminus (Ringlead/Sapper) | terminus.com | Multichannel ABM engagement: ads, chat, email signatures, web experiences; account-based orchestration and engagement scoring | Multichannel engagement breadth (ads + chat + email + web); orchestration-centric |
| Mutiny | mutiny.com | 1:1 web personalization and AI-generated landing pages for named accounts; playbooks driven by firmographic/intent signals | Pure-play web-personalization specialist; isolates the personalization surface cleanly |

True flagships: **Demandbase and 6sense** (full-stack ABX leaders, Forrester Wave / G2 grid leaders, broadest engagement coverage). **Madison Logic, RollWorks, Terminus** are flagship-tier engagement/advertising specialists. **Mutiny** is the pure-play web-personalization specialist included to sharpen the WEB-PERSONALIZATION module seam.

## Surface matrix

Vendor columns: DB=Demandbase, 6S=6sense, ML=Madison Logic, RW=RollWorks, TM=Terminus, MU=Mutiny. CONSUMED rows are ingested from GTM-PLAN, not mastered by ABM (shown for completeness, marked in the Classification column).

| Entity | Category | DB | 6S | ML | RW | TM | MU | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| ideal_customer_profiles | Master (GTM-PLAN) | x | x |  | x |  |  | CONSUMED from GTM-PLAN | (ingested; consumer role) |
| target_account_lists | Master (GTM-PLAN) | x | x | x | x | x | x | CONSUMED from GTM-PLAN | (ingested; consumer role) |
| intent_signals | Master | x | x | x | x | x | x | Core | abm_intent |
| intent_topics | Catalog | x | x | x | x | x |  | Core | abm_intent |
| intent_signal_sources | Catalog | x | x | x | x |  |  | Core | abm_intent |
| account_identifications | Master | x | x |  | x | x | x | Core | abm_intent |
| engagement_scores | Master | x | x | x | x | x |  | Core | abm_intent |
| engagement_score_models | Config | x | x |  | x | x |  | Common | abm_intent |
| abm_campaigns | Master | x | x | x | x | x |  | Core | abm_engagement_orchestration |
| account_journeys | Master | x | x |  | x | x |  | Core | abm_engagement_orchestration |
| orchestration_playbooks | Master | x | x |  | x | x | x | Core | abm_engagement_orchestration |
| audience_segments | Master | x | x | x | x | x | x | Core | abm_engagement_orchestration |
| journey_stage_transitions | Junction | x | x |  | x | x |  | Common | abm_engagement_orchestration |
| campaign_account_memberships | Junction | x | x | x | x | x |  | Core | abm_engagement_orchestration |
| engagement_activities | Engagement | x | x | x | x | x | x | Core | abm_engagement_orchestration |
| ad_campaign_targets | Master | x | x | x | x | x |  | Core | abm_advertising |
| ad_audiences | Master | x | x | x | x | x |  | Core | abm_advertising |
| ad_creatives | Config | x | x | x | x | x |  | Core | abm_advertising |
| ad_placements | Junction | x | x | x | x | x |  | Core | abm_advertising |
| ad_spend_allocations | Junction | x | x | x | x | x |  | Core | abm_advertising |
| content_syndication_programs | Master |  |  | x |  | x |  | Common | abm_advertising |
| web_personalization_rules | Master | x | x |  |  | x | x | Core | abm_web_personalization |
| web_experiences | Master | x | x |  |  | x | x | Core | abm_web_personalization |
| personalization_audiences | Junction | x | x |  |  | x | x | Core | abm_web_personalization |
| personalization_variants | Config | x |  |  |  | x | x | Common | abm_web_personalization |
| web_visitor_resolutions | Master | x | x |  |  | x | x | Core | abm_web_personalization |
| consent_records | Compliance | x | x |  | x |  | x | Compliance | abm_intent |
| data_subject_requests | Compliance |  | x |  |  |  |  | Compliance | abm_intent |
| engagement_attribution_records | Junction | x | x | x | x | x |  | Common | abm_engagement_orchestration |

Notes on classification:
- `intent_signals`, `ad_campaign_targets`, `web_personalization_rules` are the three entities GTM-PLAN Phase 0 (D3) explicitly routed downstream to ABM-PLATFORM. They are MASTERED here.
- `ideal_customer_profiles` and `target_account_lists` are MASTERED by GTM-PLAN. ABM consumes them via `domain_data_objects.role = consumer`. They are listed as vendor-present because the ABM vendors expose ICP/list UIs, but the authoring authority stays in GTM-PLAN (the planning vendors, Anaplan/Pigment/Fullcast/Salesforce, also master them, which is the proof of planning-side ownership).
- `engagement_scores` (account- and contact-level engagement) is distinct from GTM-PLAN's planning-grade `account_scores` (fit/propensity authored once per planning cycle). The two are different masters in different domains; do not collapse them.

## Compliance entities (non-optional)

GDPR/CCPA exposure is REAL for ABM-PLATFORM, unlike GTM-PLAN. The reason is the scope cut itself: ABM handles contact-level intent, person-level web-visitor resolution, and contact-level engagement, all PII. GTM-PLAN Phase 0 noted "the exposure moves with that data into ABM-PLATFORM" precisely because the contact-level intent surface lives here, not in the planning shell.

| Entity | Regulation | Proposed module | Note |
| --- | --- | --- | --- |
| consent_records | GDPR (Art. 6/7), CCPA/CPRA | abm_intent | Lawful basis and opt-in/opt-out state for contact-level intent capture, web tracking, and ad targeting. Gates whether a contact's signals may be processed/activated. |
| data_subject_requests | GDPR (Art. 15/17), CCPA/CPRA | abm_intent | Access / deletion / opt-out / do-not-sell requests against contact-level intent and engagement records. Vendors hide the internals, but the surface is mandatory wherever contact-level PII is processed. |
| web_visitor_resolutions | GDPR / CCPA (de-anonymization) | abm_web_personalization | Person/account-level resolution of anonymous web traffic. PII-bearing; its presence is itself the GDPR/CCPA trigger and the reason consent_records must gate it. |

Load these regardless of vendor presence (protocol step 4). `consent_records` and `data_subject_requests` sit in `abm_intent` because that module owns the contact-level signal capture they govern; `web_visitor_resolutions` carries its own exposure inside web personalization.

## Modularization hypothesis

Four FULL modules, each with >=1 master, matching the vendors' own packaging seams. ABM-PLATFORM has >=3 capabilities, so it needs >=2 modules (Rule #14); the vendor surface supports exactly four:

1. **ABM-INTENT** (`abm_intent`) — masters: `intent_signals`, `account_identifications`, `engagement_scores` (account/contact engagement). The signal-ingestion-and-scoring layer: third-party + first-party intent capture, anonymous-to-account resolution, and engagement/intent scoring. Hosts the compliance entities (`consent_records`, `data_subject_requests`) because it owns the contact-level signal capture they govern. This is the surface every vendor leads with (6sense predictive intent, Demandbase 2T+ signals).

2. **ABM-ENGAGEMENT-ORCHESTRATION** (`abm_engagement_orchestration`) — masters: `abm_campaigns`, `account_journeys`, `orchestration_playbooks`, `audience_segments` (engagement audiences). The multichannel orchestration brain: which accounts get which play, journey-stage progression, audience assembly, cross-channel sequencing. The Terminus/6sense orchestration core.

3. **ABM-ADVERTISING** (`abm_advertising`) — masters: `ad_campaign_targets`, `ad_audiences`. Account-based programmatic advertising: DSP targeting, ad audiences, creatives, placements, spend allocation, and content syndication (Madison Logic). Demandbase and RollWorks both run native DSPs, justifying a heavyweight standalone module.

4. **ABM-WEB-PERSONALIZATION** (`abm_web_personalization`) — masters: `web_personalization_rules`, `web_experiences`, `web_visitor_resolutions`. 1:1 account/contact web personalization and dynamic experiences. Mutiny is a pure-play here and Demandbase/6sense/Terminus all carry it, so the surface is wide enough (and structurally heavyweight: rules + variants + visitor resolution + its own PII exposure) to stand alone rather than fold into orchestration.

Recommended count: **4 modules** (ABM-INTENT, ABM-ENGAGEMENT-ORCHESTRATION, ABM-ADVERTISING, ABM-WEB-PERSONALIZATION). This is grounded in vendor packaging: full-stack leaders (Demandbase, 6sense) carry all four surfaces as distinct product areas; the specialists each anchor one (Madison Logic = advertising/syndication, RollWorks = advertising, Terminus = orchestration, Mutiny = web personalization). Three would force advertising and web-personalization to fuse against Mutiny's and Madison Logic's explicit pure-play boundaries; five would over-split (no vendor sells intent-capture and engagement-scoring as two separate products, they co-locate in ABM-INTENT).

## Consumed-from-GTM-PLAN entities (ingested, not mastered)

ABM-PLATFORM takes these as `consumer`-role `domain_data_objects` rows; GTM-PLAN remains the master/author:

- `ideal_customer_profiles` — GTM-PLAN authors ICP definitions once per planning cycle. ABM ingests them to seed intent topics, audience segments, and personalization audiences.
- `target_account_lists` — GTM-PLAN authors named/target account lists. ABM ingests them as the account universe for campaigns, journeys, ad audiences, and personalization. This is the handoff edge GTM-PLAN Phase 0 flagged (`GTM-PLAN-ACCOUNT-TARGETING` hands `target_account_lists` downstream).
- Planning-grade `account_scores` — GTM-PLAN's fit/propensity scoring (NOT the same as ABM's `engagement_scores`). ABM may read it to tier accounts for engagement spend, but it does not author it.

Do NOT model ICP authoring or target-list authoring as ABM masters. The handoff direction is GTM-PLAN (publisher) -> ABM-PLATFORM (consumer), realized via `handoffs` rows on events like `target_account_list.published` and `ideal_customer_profile.updated`.

## Domains-row metadata (seven fields, estimated)

Calibrated against the closest loaded neighbors (live read 2026-06-15): MA (`$$$`, crud 75, market 8000), CDP (`$$$`, crud 55, market 2500), REV-INTEL (`$$$`, crud 35, market 1500), GTM-PLAN (`$$$`, crud 65, market 600).

| Field | Value | Rationale |
| --- | --- | --- |
| `crud_percentage` | 55 | Substrate (campaigns, audiences, journeys, ad targets, personalization rules, consent) is CRUD + state workflow + ABAC. But the differentiator is non-declarative: predictive intent models, anonymous-to-account identity resolution, engagement/intent scoring, ad-bidding/DSP logic, and AI web-personalization. Sits with CDP (55), below MA (75) because the intent/identity/scoring engines are heavier and more algorithmic than journey orchestration. |
| `business_logic` | "Predictive and third-party intent scoring, anonymous-visitor to account identity resolution, account/contact engagement scoring models, programmatic ad bidding and audience activation, and AI-driven web personalization variant selection." | Names the non-JsonLogic-expressible computation: the four engines (intent scoring, identity resolution, engagement scoring, ad/personalization activation). Required because crud_percentage < 95. |
| `min_org_size` | `20 s <500` | RollWorks and Mutiny serve mid-market and scaling startups (sub-500 headcount routinely buy ABM advertising and web personalization). Matches CDP/REV-INTEL floor. Demandbase/6sense skew larger, but the market floor is set by the mid-market specialists, not the enterprise leaders. |
| `cost_band` | `$$$` | $100k-$500k yearly TCO for a 500-user org. Demandbase/6sense full-stack land in low-mid six figures at this size; RollWorks/Mutiny are cheaper but the band anchor is the 500-user enterprise config. Matches MA, CDP, REV-INTEL, GTM-PLAN, the entire martech-adjacent cluster. |
| `certification_required` | false | No product certification or regulator approval gates market entry. GDPR/CCPA are compliance obligations handled via consent/DSR entities, not a certification gate (cf. `regulations.certification_required` which is reserved for FedRAMP/FDA/CE-class gates). |
| `usa_market_size_usd_m` | 1200 | US-only TAM. ABM platforms are a defined sub-segment of B2B martech, smaller than MA (8000) and CDP (2500), comparable to REV-INTEL (1500) and above GTM-PLAN (600). Triangulated from the named vendors' US revenue (Demandbase, 6sense, Terminus, RollWorks/NextRoll, Madison Logic) plus the ABM-software category framing. Mid-band estimate; flag for refinement if a cited analyst figure surfaces. |
| `market_size_source_year` | 2025 | Paired with the figure above. Reflects current-cycle triangulation; matches MA/CDP source year. |

## Subtraction-list notes for Phase A

- Core/Common entities across all four modules load by default (`data_objects` + `domain_module_data_objects` master/contributor rows).
- `consent_records`, `data_subject_requests`, `web_visitor_resolutions`: load regardless of vendor count (compliance; GDPR/CCPA).
- `ideal_customer_profiles`, `target_account_lists`, planning-grade `account_scores`: do NOT create as ABM masters. Add as `consumer`-role rows pointing at the GTM-PLAN `data_objects`, and author `handoffs` GTM-PLAN -> ABM-PLATFORM.
- `content_syndication_programs` (Common, Madison Logic/Terminus): load into `abm_advertising` as a contributor; thin but real.
- `engagement_attribution_records` (Common): load into orchestration as a junction; the measurement surface every multichannel vendor exposes.
- Single-vendor `personalization_variants` / `engagement_score_models` (Config): load as Config contributors, not standalone masters.
