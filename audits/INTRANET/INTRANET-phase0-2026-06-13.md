# INTRANET (Employee Communications & Intranet) — Phase 0 Vendor-Surface Research

Date: 2026-06-13 | Status: READ-ONLY research | Governing question: is INTRANET a real
point-solution market that masters its own entities, or a leadership-tier overlay?

## 1. Flagship vendors (what they persist as first-class records)

- **Staffbase** (incl. Bananatag/ContactMonkey-class email): employee-comms platform. Persists
  **news articles, channels/spaces, email newsletters + editions, push notifications, read/open
  receipts, campaigns, audiences/targeting groups, comment/acknowledgement records**. Strong
  measurement of reach.
- **Simpplr**: AI-driven intranet. Persists **sites/spaces, pages, news posts (Newsfeed),
  targeted "Must Reads" with mandatory acknowledgement records, employee profiles (synced),
  smart-search index, engagement/analytics events**.
- **Firstup** (Dynamic Signal + SocialChorus): "intelligent communication" orchestration. Persists
  **campaigns, content cards, omnichannel journeys/sequences, audiences, delivery + open/click
  events across email/push/SMS**, and **advocacy shares**. The strongest journey-orchestration model.
- **Unily / LumApps / Akumina**: SharePoint/M365-anchored intranet platforms. Persist **spaces/hubs,
  pages, news, targeted content, navigation, employee directory overlay**. LumApps and Akumina lean
  heavily on Microsoft Graph as their directory/document source of record (they READ, not master).
- **Interact / Igloo / Happeo / Haiilo (Coyo+Smarp)**: spaces + pages + news + social posts.
  **Haiilo uniquely owns advocacy** (Smarp lineage): advocacy posts, shares, leaderboards, points.
- **Poppulo Harmony / Workshop / ContactMonkey**: comms-led, **email-newsletter system of record**:
  newsletters, editions, templates, sends, opens/clicks, surveys. Poppulo adds digital signage + push.

Frontline/adjacent: **Workvivo (Zoom), Beekeeper, WorkJam, Crew, YOOBIC** — frontline-deskless comms,
own **shoutouts/kudos, shift-attached broadcasts, chat, push to non-desk workers**.

## 2. The overlay test — does INTRANET persist records no other domain masters?

Yes, several. Candidate master entities and whether flagships model them as first-class historized records:

| Entity | First-class & historized in flagships? | Owns vs Reads |
|---|---|---|
| Spaces / sites / hubs | Yes (Simpplr, Unily, Igloo, Happeo) | **OWNS** |
| Pages / posts | Yes (all) | **OWNS** |
| News articles / announcements | Yes (all) | **OWNS** |
| Announcement targeting (audiences) | Yes (Staffbase, Firstup, Simpplr) | **OWNS** |
| Mandatory acknowledgements / "Must Read" receipts | Yes (Simpplr Must-Reads, Staffbase, Workvivo) | **OWNS** (compliance-grade) |
| Newsletters | Yes (Poppulo, Workshop, ContactMonkey, Staffbase) | **OWNS** |
| Newsletter editions / sends | Yes (same) | **OWNS** |
| Newsletter subscriptions/distribution lists | Yes | **OWNS** (often synced from HCM) |
| Push messages (mobile) | Yes (Staffbase, Simpplr, Beekeeper) | **OWNS** |
| Read/open/click receipts | Yes (all comms-led) | **OWNS** |
| Journey definitions (comms sequences) | Yes (Firstup; partial Staffbase) | **OWNS but contested** (see flag a) |
| Employee journeys (instances) + steps | Firstup yes; most intranet vendors no | **Contested** |
| Frontline shoutouts / kudos | Yes (Workvivo, Beekeeper, WorkJam) | **Contested** (recognition vendors also own) |
| Advocacy posts / shares / leaderboards | Yes (Haiilo/Smarp, Sociabble, Firstup) | **Contested** (dedicated advocacy vendors own) |
| Employee directory entries | Profile overlay only | **READS from HCM** |
| Knowledge articles | Surfaced via search | **READS from KM** |

Net: INTRANET genuinely owns a **publish/news/newsletter/acknowledgement/push/receipt** spine that
no other catalog domain masters. It reads directory (HCM) and knowledge (KM). Journey, frontline,
and advocacy are real but collide with dedicated markets.

## 3. Entity × vendor surface matrix (Core / Common / Specialist)

- **Spaces** — Core (intranet-platform table stakes)
- **Pages/posts** — Core
- **Announcements/news** — Core
- **Announcement targeting (audiences)** — Common
- **Acknowledgement receipts** — Common (Specialist-grade rigor at Simpplr/Staffbase)
- **Newsletters** — Common (Core for comms-led: Poppulo/Workshop/ContactMonkey)
- **Newsletter editions** — Common
- **Newsletter subscriptions** — Common
- **Employee directory entries** — Common but **read-only overlay** (mastered by HCM)
- **Journey definitions** — Specialist (Firstup; otherwise thin)
- **Employee journeys + steps** — Specialist
- **Frontline shoutouts** — Specialist (frontline-class vendors)
- **Push messages** — Common
- **Read receipts** — Common
- **Advocacy posts/shares/leaderboards** — Specialist (Haiilo, Sociabble; dedicated advocacy market exists)

## 4. Modularization hypothesis (proposed 5-module split)

- **INTRANET-PUBLISH** — spaces, pages/posts, content versions, navigation, media. **Strong support.**
- **INTRANET-NEWS** — announcements, audiences/targeting, acknowledgement receipts, newsletters +
  editions + subscriptions, sends, opens/clicks. **Strong support** (this is the comms-led core).
- **INTRANET-JOURNEY** — journey definitions, employee journeys, steps, triggers. **Weak-to-moderate**:
  only Firstup models it richly; mostly owned by Enboarder/ChangeEngine (see flag a).
- **INTRANET-FRONTLINE** — frontline broadcasts, shoutouts, shift-attached push, deskless profiles.
  **Moderate**: real and differentiated, but contested by Beekeeper/WorkJam.
- **INTRANET-SEARCH** — federated/employee search index, connectors, query logs. **Moderate**: a
  capability/index, thin on persisted master records (mostly an index over other domains).

Verdict: the data cleanly supports **2-3 strong modules** (PUBLISH + NEWS, arguably NEWS split into
NEWS and NEWSLETTER) plus **ANALYTICS** as a cross-cutting receipt/event store. JOURNEY, FRONTLINE,
ADVOCACY, and SEARCH are real capabilities but **thin on uniquely-mastered entities** — they lean on
adjacent domains. So **fewer than 5 entity-owning modules**; closer to 3 owners + capability overlays.

## 5. Compliance entities flagship vendors model

- **Mandatory acknowledgement / read-receipt records** (Simpplr Must-Reads, Staffbase, Workvivo):
  auditable proof an employee saw/acknowledged a policy or safety notice — used for **works-council
  (BetrVG §87 / CSE) and safety/compliance** evidence.
- **Consent for personalized targeting / behavioral analytics**: GDPR/CCPA-driven; Staffbase/Simpplr
  expose anonymized vs identified analytics and **opt-out/consent flags** for engagement tracking.
- **Works-council co-determination**: German-market vendors (Haiilo, Staffbase) support **anonymous
  analytics modes** specifically so engagement tracking passes Betriebsrat review.
- **Whistleblower (EU Directive 2019/1937)**: NOT an intranet-mastered entity — separate
  whistleblowing-case domain; intranet only links to it. Do not claim ownership.

## 6. Three collision flags (named vendors)

- **(a) Employee journeys** — **Dedicated journey-orchestration vendors own this**: **Enboarder**
  (onboarding/journey workflows), **ChangeEngine** (moments/journeys). Among intranet vendors only
  **Firstup** models journeys as first-class sequences; Staffbase has lighter "campaigns." So
  INTRANET-JOURNEY is **mostly an overlay** on a dedicated market. Flag as collision with HCM-adjacent
  journey orchestration.
- **(b) Frontline comms** — **Dedicated frontline vendors own the deepest model**: **WorkJam,
  Beekeeper, Crew (Cornerstone), YOOBIC**. Intranet vendors (Staffbase, Workvivo) added frontline
  reach but frontline-native shoutouts/shift-attached comms are richer in the specialists. Real but
  contested; frontline may deserve its own domain rather than an intranet module.
- **(c) Employee advocacy** — **Dedicated advocacy vendors own this**: **Hootsuite Amplify, Sprinklr
  (Advocacy), GaggleAMP, EveryoneSocial, Sociabble**. Among intranet vendors only **Haiilo (Smarp)**
  and **Sociabble** truly master advocacy posts/shares/leaderboards. INTRANET-ADVOCACY is largely an
  **overlay on a dedicated social-advocacy market**.

## 7. BOTTOM LINE

INTRANET is **not** a pure leadership-tier aggregator: it has a genuine, uniquely-mastered spine that
no other catalog domain owns — **spaces, pages, news/announcements, targeting audiences, mandatory
acknowledgement receipts, internal newsletters + editions + subscriptions, mobile push messages, and
read/open/click receipts**. Staffbase, Simpplr, Poppulo, Workshop, and ContactMonkey persist these as
first-class historized records, and Simpplr's compliance-grade Must-Read acknowledgements have no home
in any other domain. So INTRANET is a **real point-solution market** for its PUBLISH + NEWS +
NEWSLETTER core. However, three of its eight capabilities — **JOURNEY, FRONTLINE, ADVOCACY** — are
overlays on **dedicated adjacent markets** (Enboarder/ChangeEngine; WorkJam/Beekeeper; Hootsuite
Amplify/Sociabble/Haiilo), and **SEARCH** is an index over HCM/KM, not a master.

**Recommended route: (c) HYBRID.** Treat INTRANET as a **real point-solution domain with ~3 entity-
owning modules** (INTRANET-PUBLISH, INTRANET-NEWS, INTRANET-NEWSLETTER) plus **INTRANET-ANALYTICS** as
the receipt/event store, and demote **JOURNEY, FRONTLINE, ADVOCACY, SEARCH** to **capability overlays
or cross-domain links** rather than full master modules — with FRONTLINE flagged as a candidate
standalone domain. Do **not** stand up 5 co-equal entity-mastering modules: the vendor evidence only
supports ~3.
