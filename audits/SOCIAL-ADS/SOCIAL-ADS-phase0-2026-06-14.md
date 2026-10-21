# SOCIAL-ADS Phase 0 - Vendor Surface (Paid Social Advertising)

Date: 2026-06-14. Candidate: SOCIAL-ADS (Paid Social Advertising). Triage mention count: 2 (SMM audit).

## Triage context and live overlap check

Live catalog query (CLI, never MCP):
`/domains?or=(domain_code.eq.SMM,domain_code.eq.ADV-AD-TECH,domain_code.eq.MA,domain_code.eq.REV-INTEL,domain_name.ilike.*advertis*,domain_name.ilike.*social*,domain_name.ilike.*ad %)`

Result (3 rows, ADV-AD-TECH absent):

| Code | Name | Scope | crud% | min_org | cost |
|---|---|---|---|---|---|
| SMM | Social Media Management | Cross-channel **organic** publishing, scheduling, engagement (unified inbox), listening, analytics, influencer/advocacy. Distinct from MA/CDP/SALES-ENG. | 78 | 10 xs <50 | $$ |
| MA | Marketing Automation | Email/SMS/cross-channel **lifecycle** campaign orchestration, lead nurturing, journey management (ABM + B2C). | 75 | 10 xs <50 | $$$ |
| REV-INTEL | Revenue Intelligence | AI analytics on sales activity, deal signals, forecasting, conversation intelligence. | 35 | 20 s <500 | $$$ |

**ADV-AD-TECH does NOT exist** in the catalog (confirmed: no row, and no domain_name matching advertis*/programmatic/DSP). The adjacency listed in triage is aspirational, not real. So there is **no existing home** for paid social ad management:
- SMM is **organic** publishing/engagement/listening, explicitly not paid ad-platform campaign orchestration.
- MA is email/SMS lifecycle journeys, not ad-account budget/bid/creative management.
- No programmatic/DSP/ad-tech domain exists to fold into.

## Flagship vendors (2026 landscape with M&A)

| Vendor | URL | Specialist in | Independent? | Why included |
|---|---|---|---|---|
| Smartly.io | smartly.io | Cross-channel paid social orchestration + dynamic creative optimization (DCO) across Meta/TikTok/Snapchat/Pinterest; AI Studio creative gen; dynamic product ads | Independent (Providence Equity-backed, operates standalone) | Clearest enterprise pure-play "paid social OS" |
| Madgicx | madgicx.com | AI Meta-ads "super app": creative analytics, AI audiences/lookalikes, automated bidding/budget; e-commerce $20K-$100K+/mo Meta spend | Independent | Pure paid-social (Meta-heavy) flagship |
| Strike Social | strikesocial.com | AI-optimized social/YouTube ad campaign management (managed service + proprietary software/ADA AI) | Independent | Pure social-advertising flagship |
| Adsmurai | adsmurai.com | Paid social campaign management + product-feed/DCO across Meta/TikTok/Pinterest/Google; ~450 employees | Independent (private) | Pure-play paid-social (EU) supporting vendor |
| Skai (ex-Kenshoo) | skai.io | Omnichannel performance ads: search + **paid social** + retail media across 100+ publishers; incrementality/lift, budget/bid recs | Independent | Dedicated paid-social product line; enterprise reference (omnichannel, not pure-play) |

M&A / rebrand notes:
- **AdEspresso** -> acquired by **Hootsuite** (2017); now an SMM-suite paid module, not an independent pure-play. Belongs to SMM-vendor orbit. (record as solution under SMM/aliases context, NOT a flagship here.)
- **ROI Hunter** -> acquired by **Pattern** (Dec 2025); pivoted to product-level / retail-media performance, not pure paid-social.
- **Pencil** -> acquired by **The Brandtech Group** (2023); generative ad-creative SaaS, creative-tooling not campaign orchestration.
- **Kenshoo -> Skai** rebrand; broadened from search/social into omnichannel + retail media.
- **Smartly.io** absorbed Ad-Lib.io (DCO) and Viralspace earlier; consolidated as the creative+media "paid social OS."

## Point-solution-market test

Independent vendors whose FLAGSHIP product is paid-social-ad management: **Smartly.io, Madgicx, Strike Social, Adsmurai** (4) -> **PASS (>=3).** Skai adds an enterprise omnichannel reference. The market is NOT just one pure-play with SMM modules around it; there are multiple independent flagships. Acquired tools (AdEspresso, ROI Hunter, Pencil) confirm the category is real and consolidating, not that it is a mere sub-feature.

## Surface matrix

V1 Smartly.io | V2 Madgicx | V3 Strike Social | V4 Adsmurai | V5 Skai

| Entity | Category | V1 | V2 | V3 | V4 | V5 | Class | Proposed module |
|---|---|:-:|:-:|:-:|:-:|:-:|---|---|
| social_ad_campaigns | Master | x | x | x | x | x | Core | CAMPAIGN-ORCHESTRATION |
| social_ad_sets | Master | x | x | x | x | x | Core | CAMPAIGN-ORCHESTRATION |
| social_ads | Master | x | x | x | x | x | Core | CAMPAIGN-ORCHESTRATION |
| social_ad_accounts | Master | x | x | x | x | x | Core | CAMPAIGN-ORCHESTRATION |
| ad_budget_allocations | Master | x | x | x | x | x | Core | CAMPAIGN-ORCHESTRATION |
| ad_audiences | Master | x | x | x | x | x | Core | CAMPAIGN-ORCHESTRATION |
| bid_strategies | Config | x | x | x |  | x | Common | CAMPAIGN-ORCHESTRATION |
| social_ad_creatives | Master | x | x | x | x | x | Core | CREATIVE-OPTIMIZATION |
| creative_variants | Junction | x | x |  | x | x | Core | CREATIVE-OPTIMIZATION |
| creative_assets | Master | x | x |  | x |  | Common | CREATIVE-OPTIMIZATION |
| dco_rules | Config | x |  |  | x | x | Common | CREATIVE-OPTIMIZATION |
| product_feeds | Config | x |  |  | x | x | Common | CREATIVE-OPTIMIZATION |
| social_ad_performance_metrics | Master | x | x | x | x | x | Core | CAMPAIGN-ORCHESTRATION (+ shared) |
| attribution_models | Config | x |  |  |  | x | Common | (defer - measurement) |
| incrementality_tests | Master |  |  |  |  | x | Specialist | (defer - measurement) |
| conversion_events | Junction | x | x |  | x | x | Common | CAMPAIGN-ORCHESTRATION |
| ad_approval_reviews | Junction | x |  | x |  |  | Common | (defer - workflow) |

## Compliance entities

Paid social advertising is lightly regulated at the platform-API layer (platform policy review, not statutory). No FCRA/HIPAA/SOX/GDPR-consent master is required for the ad-orchestration core (consent lives in CDP/MA). Platform ad-policy review (`ad_approval_reviews`) is a platform-enforced gate, not a statutory compliance master; deferred unless in scope. No non-optional compliance masters for v1.

## Modularization hypothesis

Two full modules (Rule #14, >=3 capabilities => >=2 modules + DMDO + capabilities):
1. **SOCIAL-ADS-CAMPAIGN-ORCHESTRATION** - cross-channel campaign/ad-set/ad structure, ad accounts, budget reallocation, audiences, bid strategies, conversion events, performance metrics. Owns the operational workflow (campaign lifecycle: draft -> in_review -> active -> paused -> completed/archived).
2. **SOCIAL-ADS-CREATIVE-OPTIMIZATION** - creative master + variant versioning, DCO rules, creative assets, product feeds. Owns creative versioning + dynamic optimization.

Masters to load: social_ad_campaigns, social_ad_sets, social_ad_creatives, ad_budget_allocations, ad_audiences, social_ad_performance_metrics, creative_variants (plus social_ads, social_ad_accounts as supporting masters). Measurement entities (attribution_models, incrementality_tests) deferred to a b3 follow-up (REV-INTEL adjacency); conversion data handoff to attribution emitted as a trigger_event.

## Adjacency / handoff map

- **SMM** (organic publishing) <-> SOCIAL-ADS (paid): "boost"/promote an organic post becomes a paid campaign; cross-domain edge + handoff (campaign published -> SMM context). Boundary is the gate question.
- **MA** (lifecycle): audience sync / suppression lists feed ad_audiences; conversion outcomes feed nurture.
- **REV-INTEL**: conversion/attribution data -> pipeline/revenue analytics (outbound handoff).

## VERDICT: promote-as-domain

Rationale: paid social ad management has no existing catalog home (SMM=organic, MA=lifecycle, ADV-AD-TECH does not exist), passes the point-solution test with 4 independent flagships (Smartly.io, Madgicx, Strike Social, Adsmurai) plus an enterprise omnichannel reference (Skai), and carries a distinct entity surface (ad accounts, ad sets, budget reallocation, DCO, creative variants, audiences, platform conversion events) not modeled by any sibling. Distinct domain.
