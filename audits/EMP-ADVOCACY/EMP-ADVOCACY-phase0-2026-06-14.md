# EMP-ADVOCACY Phase 0 — Vendor Surface & Triage

Date: 2026-06-14. Tenant: adenin. Candidate: Employee Advocacy Platform (domain_code EMP-ADVOCACY).
Mention count: 4 (SMM audit, EMP-EXP audit, INTRANET audit).

## Verdict

**promote-as-domain.**

The market has a dedicated Gartner Peer Insights category ("Employee Advocacy Tools", `marketSeoName=employee-advocacy-tools`) and clears the point-solution test with multiple independent flagship pure-plays. SMM names "influencer/advocacy programs" in a single clause, but that clause is influencer-marketing scope (external influencers) and a one-line mention is not coverage of the advocacy entity surface (advocate profiles, gamification/leaderboards, internal content curation/broadcast to employees, social-share-to-revenue attribution). Distinct buyer split (Marketing brand/demand-gen + HR/Internal Comms) and a distinct workflow substrate justify a standalone domain rather than a fold into SMM.

## Point-solution market test

Question: >=3 INDEPENDENT vendors whose FLAGSHIP product is employee advocacy?

| Vendor | Independent? | Flagship = advocacy? | Notes |
| --- | --- | --- | --- |
| DSMN8 | Yes (UK, founded 2016, independent) | Yes — pure-play "The Employee Advocacy Platform" | Self-styled #1; Gartner presence in Employee Advocacy Tools AND Social Marketing Management |
| GaggleAMP | Yes (founder-owned, no parent/investor lines) | Yes — "the first employee advocacy platform", focused exclusively | Gamification-led |
| EveryoneSocial | Acquired by Seismic (2024) | Yes — standalone advocacy/social-selling flagship | Now "EveryoneSocial by Seismic"; product remains a standalone advocacy flagship, enterprise-tilted post-acquisition |
| Oktopost | Independent | Core pillar (B2B social suite: advocacy + SMM + listening + ads) | B2B social engagement suite; advocacy is a first-class pillar, not the sole product |
| Sociabble | Acquired by Poppulo (2024/2025) | Yes — advocacy + EX/comms all-in-one | Earlier acquired SociallyMap/SociallyUp (2022) |

**Result: PASS.** DSMN8 + GaggleAMP + EveryoneSocial are three flagship-advocacy products (two fully independent, one acquired but still a standalone flagship), plus Oktopost (independent, advocacy as core pillar) and Sociabble. The existence of a named Gartner market category is corroborating evidence.

## M&A / rebrand landscape (2026)

- **Bambu (Sprout Social).** Rebranded to "Employee Advocacy by Sprout Social" in Oct 2022; integrated into the Sprout suite. NOTE: candidate metadata claimed Bambu was "discontinued 2023" — research does NOT confirm a 2023 discontinuation; it is a suite module marketed under the Sprout brand. (Suite-absorbed either way; not an independent pure-play.)
- **Smarp.** Did NOT become Sociabble (candidate metadata error). Smarp (Finland) merged with COYO (Germany) and Jubiwee (France) and the combined entity rebranded to **Haiilo** in Feb 2022. Haiilo = social intranet + comms + advocacy + engagement (now EX-suite, not pure-play).
- **Sociabble.** Acquired by **Poppulo** (2024/2025) to expand Poppulo's EX/comms platform (social intranet, frontline mobile, advocacy, recognition). Earlier acquired Alhena/SociallyMap/SociallyUp (2022).
- **EveryoneSocial.** Acquired by **Seismic** (2024); now "EveryoneSocial by Seismic", enterprise-tilted (social selling angle; Seismic earlier bought Grapevine6 for social selling).
- **Firstup.** Formed from the **SocialChorus + Dynamic Signal** merger; carries advocacy alongside its comms platform (overlaps INTRANET/FRONTLINE-COMMS more than pure advocacy).
- **PostBeyond.** Acquired by **Influitive** (customer advocacy/community vendor) — sits at the seam between employee advocacy and customer advocacy.
- **Hootsuite Amplify** and **Sprinklr Advocacy** are suite modules (not independent).
- **GaggleAMP, DSMN8, Oktopost** remain independent.

Net: even with Bambu (Sprout), Amplify (Hootsuite), Sprinklr, Sociabble (Poppulo), EveryoneSocial (Seismic), Smarp (Haiilo) all suite-absorbed or acquired, **GaggleAMP + DSMN8 + Oktopost** remain independent advocacy-flagship/advocacy-core products. The market is not collapsing into suites.

## Catalog overlap check (live)

Query: `/domains?or=(...)`. Adjacent domains found:

| domain_code | domain_name | Advocacy claimed? |
| --- | --- | --- |
| SMM | Social Media Management | Mentions "influencer/advocacy programs" in one clause (crud 78, $$). This is the fold-vs-promote gate. Reading: it is influencer-marketing scope; advocacy entity surface (advocate profiles, leaderboards, employee broadcast, share-to-revenue) is NOT modeled. NOT a real overlap. |
| EMP-EXP | Employee Experience and Engagement | Surveys/pulse/360/listening. No advocacy. Distinct. |
| HCM | Human Capital Management | HRIS system of record. No advocacy. Supplies `employees` (consume). |
| INTRANET | Employee Communications & Intranet | Internal news/announcements, deskless, journeys. INTERNAL audience only. Advocacy = employees resharing to THEIR EXTERNAL social networks. Distinct. |
| ONBOARDING | Employee Onboarding | Unrelated. |
| SOCIAL-ADS | Paid Social Advertising | Paid surface of social. Unrelated to organic advocacy. |

Boundary lines that hold:
- vs **SMM**: SMM = brand-owned social channels. Advocacy = employees' personal networks. Outbound handoff: advocacy share -> SMM attribution.
- vs **INTRANET / FRONTLINE-COMMS**: those broadcast INTERNALLY. Advocacy broadcasts curated content TO employees so they reshare EXTERNALLY. Internal newsletter generation is the seam (advocacy curates for external reshare, not internal-only consumption).
- vs **EMP-EXP**: engagement listening, no external reach mechanics.

## Flagship vendors (Phase A seed)

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| EveryoneSocial | everyonesocial.com | Enterprise employee advocacy / social selling | Flagship advocacy pure-play (now Seismic) |
| Sociabble | sociabble.com | Advocacy + EX/comms all-in-one | Flagship advocacy (now Poppulo) |
| GaggleAMP | gaggleamp.com | Gamified employee advocacy | Independent, gamification-led pure-play |
| DSMN8 | dsmn8.com | Employee advocacy + analytics | Independent UK pure-play, Gartner-recognized |
| Oktopost | oktopost.com | B2B social + advocacy | Independent B2B; advocacy as governed/revenue-connected pillar |

## Surface matrix

Vendors: ES=EveryoneSocial, SO=Sociabble, GA=GaggleAMP, D8=DSMN8, OK=Oktopost.
Entity names snake_case_plural, vendor-neutral (Rule #18). Prefixed `advocacy_*` / `advocate_*` to avoid collisions (Rule #9).

| Entity | Category | ES | SO | GA | D8 | OK | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| advocacy_programs | Master | x | x | x | x | x | Core | content-distribution |
| advocacy_content | Master (curated items to reshare) | x | x | x | x | x | Core | content-distribution |
| advocacy_content_streams | Config (topic/feed channels) | x | x | x | x | x | Core | content-distribution |
| advocacy_shares | Master (an employee's reshare action) | x | x | x | x | x | Core | content-distribution |
| advocate_profiles | Master (user-typed advocate, HCM employee) | x | x | x | x | x | Core | content-distribution |
| advocacy_social_accounts | Junction (advocate's linked LinkedIn/X/FB) | x | x | x | x | x | Core | content-distribution |
| advocacy_suggested_posts | Config (pre-written share copy) | x | x | x | x | x | Core | content-distribution |
| advocacy_internal_newsletters | Engagement (digest of content to advocates) | x | x | x | x |  | Common | content-distribution |
| advocacy_points_ledger | Junction (points earned per action) | x | x | x | x | x | Core | gamification-analytics |
| advocacy_rewards | Master (reward catalog / redemption) | x | x | x | x |  | Common | gamification-analytics |
| advocacy_leaderboards | Master (ranking board) | x | x | x | x | x | Core | gamification-analytics |
| advocate_scores | Junction (influencer/advocate scoring) | x | x | x | x | x | Core | gamification-analytics |
| advocacy_share_metrics | Audit (clicks/reach/EMV per share) | x | x | x | x | x | Core | gamification-analytics |
| advocacy_attribution_records | Audit (share -> pipeline/revenue) | x |  |  | x | x | Common | gamification-analytics |
| advocacy_campaigns | Master (time-boxed push) | x | x | x | x | x | Core | content-distribution |
| advocacy_content_approvals | Junction (compliance/brand review) | x | x |  | x | x | Common | content-distribution |

## Compliance entities

Not a heavily regulated market. `advocacy_content_approvals` covers brand/regulatory pre-share review (relevant in financial services / FINRA-style supervised-social contexts), loaded as Common, not flagged as a formal compliance carve-out. No HIPAA/FCRA/SOX/GDPR-specific entities required beyond standard.

## Modularization hypothesis (>=2 full modules, Rule #14)

- **EMP-ADVOCACY-CONTENT-DISTRIBUTION** — curate brand content and broadcast it to employees, who reshare to their personal networks. Masters: advocacy_programs, advocacy_content, advocacy_shares, advocate_profiles, advocacy_campaigns. Carries the share workflow + content lifecycle + advocate onboarding/social-account linking.
- **EMP-ADVOCACY-GAMIFICATION-ANALYTICS** — incentivize and measure advocacy. Masters: advocacy_leaderboards, advocacy_rewards. Carries points ledger, advocate/influencer scoring, reach/EMV metrics, and share-to-revenue attribution (outbound handoff to SMM attribution and REV-INTEL).

Cross-domain edges: consume HCM `employees` (advocate is HCM employee); consume SMM brand `content`; outbound: advocacy share -> SMM social attribution, advocacy reach/EMV -> REV-INTEL; relate to EMP-EXP (engaged employees) and INTRANET (internal comms seam). Advocate is user-typed (Rule #10).

## B3 / follow-ups (non-blocking)

- b3: customer/partner advocacy (Influitive/PostBeyond seam) is a separate idea, not part of this domain.
- b3: social-selling pipeline depth (Seismic/EveryoneSocial angle) leans toward SALES-ENG; keep attribution edge only.
- Note for SMM: its description's "influencer/advocacy programs" clause should be narrowed to influencer-only once EMP-ADVOCACY lands (controller decision; not done here).
