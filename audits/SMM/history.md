# SMM audit history

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **ZERO `domain_modules` rows** (M1 hard fail; Rule #14 mandates >=1). 5 masters (`social_posts`, `social_accounts`, `social_messages`, `social_mentions`, `social_listening_topics`, `influencers`); 4 cross-domain contributor/consumer rows on the legacy `domain_data_objects` rollup (`customers`, `crm_contacts`, `crm_leads`, `marketing_campaigns`, `audience_segments`); 7 capabilities (`SOCIAL-PUB`, `SOCIAL-ENGAGE`, `SOCIAL-LISTEN`, `SOCIAL-ANALYTICS`, `CONTENT-CAL`, `INFLUENCER-MGMT`, `EMPLOYEE-ADVOCACY`); 12 solutions (10 primary + 2 partial); 6 `trigger_events` (3 with empty `event_category`); 8 outbound cross-domain handoffs + 0 inbound; 2 cross-domain `data_object_relationships` (both SMM → CSM `customer_cases`); 0 aliases; 0 lifecycle states across all 5 masters; 1 legacy domain-level system skill + 12 skill_tools (F1 fail); 0 roles linked to SMM modules (vacuous because no modules); 0 `domain_regulations`.
- **Vendor-surface basis:** Hootsuite, Sprout Social, Buffer, Sprinklr Social, Khoros Marketing, Agorapulse, Meltwater, Brandwatch, Emplifi Social Marketing Cloud, Zoho Social (primary); HubSpot Marketing Hub, Salesforce Marketing Cloud Engagement (partial). No compliance specialist enumerated (the market's privacy / disclosure overlap routes through GDPR / CCPA / FTC influencer-disclosure rules, but the catalog has no `domain_regulations` rows linking SMM to any of these — see B1-S15).
- **Bucket 1 (in-scope, agent fixable):** 16 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO/contrib | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| CRM | 2 | 0 | 3 (customers, crm_contacts, crm_leads) | 0 | 5 | Pairwise (full) |
| CSM | 3 | 0 | 0 | 2 (social_messages, social_mentions triage to customer_cases) | 5 | Pairwise (full) |
| CDP | 1 | 0 | 2 (customers contributor, audience_segments consumer) | 0 | 3 | Pairwise (full) |
| MA | 2 | 0 | 1 (marketing_campaigns contributor) | 0 | 3 | Pairwise (full) |
| MDM | 0 | 0 | 1 (customers also MDM-mastered) | 0 | 1 | Lightweight |
| SUB-MGMT | 0 | 0 | 1 (customers also SUB-MGMT-mastered) | 0 | 1 | Lightweight |

**Structural pass headline:** **M1 hard fail (zero `domain_modules` rows for SMM).** This is the gating defect that blocks M2/M4/M5/M6/M7 (vacuous), E1-E6 (no modules to author roles against), F2-F5 (no module-level system skills), B9b (no cross-module surface). The legacy domain-level system skill (F1) and legacy `domain_data_objects` rollup rows persist from the pre-modular SMM load. Every B-band finding below assumes the M-band gets cured first; the proposed module set is **SMM-PUBLISHING**, **SMM-ENGAGEMENT**, **SMM-LISTENING**, **SMM-INFLUENCER** (Bucket 1, B1-S1) which rebalances the 5 masters across 4 modules and lets the 7 capabilities map cleanly.

Other structural failures: **B7 hard fail** (zero `users` edges on any SMM master); **B12 hard fail** (zero lifecycle states across all 5 masters); **B6 partial-fail** (zero intra-domain `data_object_relationships` despite obvious chains, e.g. `social_accounts publishes social_posts`, `influencers authors social_posts`, `social_listening_topics matches social_mentions`); **B9 partial-fail** (3 events with empty `event_category` per Rule #13; missing events for `social_post.scheduled / .published / .failed`, `influencer.contracted / .terminated`, `social_account.disconnected / .expired`); **B11 partial-fail** (zero aliases; vendor-synonym surface exists: Sprinklr "Cases" for messages, "Conversations", "Brand Mentions"); **H1 hard fail** (0/8 cross-domain handoffs carry `handoff_processes` rows; volume target 4-6).

Domain Semantius score (strict, on the legacy skill): **8/12 = 67%** (8 platform query/mutate tools, 4 external compute / side_effect tools). Operational score same (no integration-tier tools linked).

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail)** | **Zero `domain_modules` rows for SMM.** Rule #14: every `domains` row MUST have >=1 `module_kind='full'` `domain_modules` row; domains with >=3 capabilities need >=2. SMM has 7 capabilities and zero modules, so the floor is >=2. Proposed module shape (subject to user confirmation): **SMM-PUBLISHING** (masters: `social_posts`, `social_accounts`; realizes `SOCIAL-PUB`, `CONTENT-CAL`, `SOCIAL-ANALYTICS`), **SMM-ENGAGEMENT** (master: `social_messages`; embedded_master: `social_accounts`; realizes `SOCIAL-ENGAGE`, `SOCIAL-ANALYTICS`), **SMM-LISTENING** (masters: `social_mentions`, `social_listening_topics`; realizes `SOCIAL-LISTEN`, `SOCIAL-ANALYTICS`), **SMM-INFLUENCER** (master: `influencers`; realizes `INFLUENCER-MGMT`). `EMPLOYEE-ADVOCACY` capability is orphan candidate (M6) — either folds into SMM-PUBLISHING or signals a fifth module **SMM-ADVOCACY** if the user wants advocacy as a deployable unit (also see _missing-domains.md EMP-ADVOCACY candidate). | Author 4 (or 5) `domain_modules` rows with `module_kind='full'`. Migrate the existing `domain_data_objects` rollup rows into matching `domain_module_data_objects` per the proposed assignment; the rollup then becomes derived from DMDO per the at-a-glance rule. Cure cascades M2 (>=2 modules satisfied), M4 (each capability maps to >=1 realizing module), M6 (each module realizes >=1 capability). |
| B1-S2 | **F1 (fail)** | **Legacy domain-level system skill `smm-system` (id=18, `domain_module_id=null`).** Acceptable transitional state only until module-level system skills exist; once B1-S1 lands, the legacy skill is obsolete and the 12 existing skill_tools rows should be redistributed across 4 (or 5) per-module system skills. | After B1-S1 lands: author 4 new `skills` rows (`smm_publishing_agent`, `smm_engagement_agent`, `smm_listening_agent`, `smm_influencer_agent`) each `skill_type='system'`, `domain_module_id` set; redistribute the existing skill_tools rows; DELETE skill id 18. |
| B1-S3 | **B12 (hard fail)** | **Zero `data_object_lifecycle_states` rows across all 5 SMM masters.** Workflow-bearing masters with clear state machines: `social_posts` (draft -> submitted -> approved -> scheduled -> published / failed / cancelled), `social_messages` (new -> triaged -> assigned -> responded / escalated -> closed), `influencers` (prospect -> outreach -> contracted -> active -> terminated), `social_accounts` (pending_connection -> active -> expired -> disconnected), `social_listening_topics` (config-shape: active / paused / archived; possibly exempt). `social_mentions` is event-shape, not workflow (no states needed). Per Rule #12 the load is non-deferrable. | Draft state machines per master and load via a focused loader. `social_posts.scheduled` and `.published` map to workflow gates (`requires_permission=true`); `social_messages.responded` (gate); `influencer.contracted` (gate); rest are non-gated states. Anchor each gate state's `domain_module_id` to the realizing module post-B1-S1. |
| B1-S4 | **B7 (hard fail)** | **Zero `data_object_relationships` rows between `users` (748) and any SMM master.** Every SMM master carries user-typed actors: `social_posts` (author, scheduler, approver), `social_messages` (assignee, resolver), `social_mentions` (assignee), `social_accounts` (owner), `influencers` (relationship_manager, contract_signer), `social_listening_topics` (owner). Rule #10: built-in edges MUST be recorded in `data_object_relationships`. | Author 6-10 `users`-edge rows (verb-shape, e.g. `authors_social_post`, `manages_influencer_relationship`, `responds_to_social_message`, `owns_social_account`, `assigned_to_social_mention`) plus inverse rows where the actor cardinality warrants. |
| B1-S5 | **B6 (partial fail)** | **Zero intra-domain `data_object_relationships` despite obvious in-domain workflow chains.** Expected edges: `social_accounts publishes social_posts` (one_to_many), `influencers authors social_posts` (one_to_many — when posts come from contracted creators), `social_listening_topics matches social_mentions` (one_to_many), `social_accounts receives social_messages` (one_to_many). | Author 4 intra-domain relationship rows with verb + inverse_verb + relationship_type + relationship_kind + is_required + owner_side. |
| B1-S6 | **B9 (Rule #13)** | **3 `trigger_events` with empty `event_category` (Rule #13 enum: `lifecycle / state_change / threshold / signal`).** Rows: 522 `social_account.connected` -> `lifecycle`; 523 `social_listening_topic.alert` -> `signal`; 524 `influencer.engagement_recorded` -> `signal`. Plus inbound handoff 511 (no event row owned by SMM but reuses 523's event with the empty category). | PATCH the 3 events. |
| B1-S7 | **B9 (missing events)** | **Missing trigger_events for several lifecycle states the B1-S3 fix would create.** Specifically: `social_post.scheduled`, `social_post.published` (the existing `social_post.published` event 120 covers this, OK), `social_post.failed`, `social_message.responded`, `influencer.contracted`, `influencer.terminated`, `social_account.disconnected`, `social_account.expired`. The lifecycle states do not yet exist (B1-S3), so the events follow that fix; sequencing: B1-S3 first, then the events, then the workflow-gate permission derivation. | Author ~7 missing `trigger_events` rows after B1-S3 ships state machines. |
| B1-S8 | **B6 / B8 missing cross-domain relationships** | The 8 cross-domain handoffs have only 2 corresponding `data_object_relationships` rows (`social_messages triages into customer_cases`, `social_mentions triages into customer_cases`, both to CSM). Missing edges from the payload->target master mapping: handoff 88 (`social_lead.captured` -> CRM `crm_leads`, payload `crm_leads`) -> SMM mastered `social_posts` or `social_messages` should have an edge to `crm_leads` (verb `generates`); handoff 89/512 (`social_engagement.recorded` -> CDP/CRM, payload `customers`) -> SMM `social_messages`/`social_mentions` should have an edge to `customers` (verb `enriches_profile_of`); handoff 90 (`influencer_campaign.completed` -> MA, payload `marketing_campaigns`) -> SMM `influencers` should have an edge to `marketing_campaigns` (verb `executes_for`); handoff 91 (`social_post.published` -> MA, payload `marketing_campaigns`) -> SMM `social_posts` to `marketing_campaigns` (verb `attributed_to`). | Author 4-5 cross-domain relationship rows with the payload->target mapping. |
| B1-S9 | **B10b (NULL source_domain_module_id, currently legitimate)** | All 8 outbound handoffs carry NULL `source_domain_module_id` because SMM has zero modules. Currently legitimate per B10b's "the NULL is a defect only when the source domain has modules" rule; once B1-S1 lands, the NULLs MUST be backfilled per the deterministic derivation (the module that masters the trigger_event's `data_object_id` with the strongest role). Per-row target after B1-S1: 86, 87 (events on `social_messages` -> SMM-ENGAGEMENT); 88 (event on `crm_leads` -> not mastered by SMM, this is a cross-domain edge where the SOURCE event is mis-attributed; see B1-S10); 89, 512 (events on `customers` -> not mastered by SMM, also B1-S10); 90 (event on `marketing_campaigns` -> not mastered by SMM, B1-S10); 91 (event on `social_post.published` data_object 125 -> SMM-PUBLISHING); 511 (event on `social_listening_topic.alert` data_object 129 -> SMM-LISTENING). | After B1-S1: PATCH `source_domain_module_id` per the master-resolution rule for the 4 rows where SMM masters the event data_object; surface the other 4 in B1-S10 as event-attribution defects. |
| B1-S10 | **B9 event-attribution defect** | **Four cross-domain handoffs (88, 89, 90, 512) carry `trigger_events` whose `data_object_id` is mastered by the TARGET domain, not SMM.** Specifically: handoff 88's event 'social_lead.captured' points at `crm_leads` (mastered by CRM); handoff 89's event 'social_engagement.recorded' points at `customers` (mastered by CRM/CSM/SUB-MGMT/CDP/MDM); handoff 90's event 'influencer_campaign.completed' points at `marketing_campaigns` (mastered by MA); handoff 512 reuses event 'social_engagement.recorded'. SMM is the publisher but the events name target-domain data_objects, so B10b's `source_domain_module_id` derivation produces no candidate (the "no candidate" subcase 2 in B10b). The correct shape: SMM-owned events on SMM-mastered data_objects (e.g. `social_message.lead_qualified` on `social_messages`; `social_engagement.observed` on `social_mentions` or `social_messages`; `social_post.campaign_completed` on `social_posts`) with the cross-domain payload remaining as `handoffs.data_object_id` pointing at the target master. | Author replacement events keyed against SMM masters; re-target the 4 handoffs to the new events; DELETE the old events (or leave for archival). User decides whether to re-target or live with mis-attributed events. |
| B1-S11 | **B11 (vendor aliases missing)** | Zero `data_object_aliases` rows across the 5 SMM masters. Vendor-synonym surface (subset): `social_messages` -> "Conversations" (Sprout, Sprinklr), "Cases" (Sprinklr), "Inbox Threads" (Hootsuite); `social_mentions` -> "Brand Mentions" (Brandwatch, Meltwater), "Buzz Items" (Talkwalker); `social_posts` -> "Updates" (LinkedIn API), "Drafts" / "Scheduled Posts" (Buffer); `social_accounts` -> "Profiles" (Hootsuite, Sprout), "Connected Channels" (Sprinklr); `social_listening_topics` -> "Queries" (Brandwatch), "Smart Folders" (Talkwalker), "Themes" (Meltwater); `influencers` -> "Creators" (Aspire, CreatorIQ), "Talent" (Mavrck). | Author ~12-18 alias rows; `alias_type='vendor_specific'` for tool-shaped synonyms and `'industry_synonym'` for terms broadly understood across the market. |
| B1-S12 | **APQC TAGGING (high-confidence, agent_curated)** | 0/8 cross-domain handoffs carry `handoff_processes` rows. Volume target per SKILL = 0.5N to 0.8N -> 4 to 6 agent_curated tags. Proposed rows below (each `proposal_source='agent_curated'`, `record_status='new'`). | INSERT into `handoff_processes` per the table below; the natural `(handoff_id, process_id)` composed key prevents duplicates. |

**APQC TAGGING proposals (B1-S12 detail):**

| handoff_id | source -> target | trigger_event | payload | Proposed PCF (process_name / external_id) | Confidence |
|---|---|---|---|---|---|
| 86 | SMM -> CSM | `social_message.received` | `social_messages` | Monitor and respond to social media activity (16627 L4) | confident L4 |
| 87 | SMM -> CSM | `social_mention.detected` | `social_mentions` | Monitor and respond to social media activity (16627 L4) | confident L4 |
| 88 | SMM -> CRM | `social_lead.captured` | `crm_leads` | Identify/receive leads/opportunities (10189 L4) | confident L4 |
| 89 | SMM -> CDP | `social_engagement.recorded` | `customers` | Analyze and respond to customer insight (16613 L3) | confident L3 |
| 90 | SMM -> MA | `influencer_campaign.completed` | `marketing_campaigns` | Develop and manage brands (11445 L3) — or child if a campaign-execution L4 exists | needs PCF re-lookup at fix time |
| 91 | SMM -> MA | `social_post.published` | `marketing_campaigns` | Develop and manage brands (11445 L3) — or child | needs PCF re-lookup |
| 511 | SMM -> CSM | `social_listening_topic.alert` | `social_mentions` | Monitor and respond to social media activity (16627 L4) — share with 86/87 cluster, OR Conduct brand level social sentiment analysis (19640 L4) | confident L4 |
| 512 | SMM -> CRM | `social_engagement.recorded` | `customers` | Analyze and respond to customer insight (16613 L3) | confident L3 |

Note: handoff 90/91 lookups for marketing-communications L4 children (`11173`, `11174` did not return clear `Manage advertising and customer communications` rows in pre-flight; the audit's confidence target is L3 `Develop and manage brands (11445)` with a re-search recommended at fix time). Tag anyway — Discover Pass 1.5 procedure says agent_curated entries always supersede `discovery_substring`.

#### Bucket 1 finding-type counts

| Finding type | Count |
|---|---|
| STRUCTURAL (M1 + F1 + B12 + B7 + B6 + B9 enum + B9 missing + B6/B8 + B10b + B9-attribution + B11) | 11 |
| MISSING (none — Bucket 3 covers semantic gaps) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| BOUNDARY (covered above in STRUCTURAL) | 0 |
| **APQC TAGGING** (8 agent_curated proposed across 8 handoffs) | 1 (B1-S12 with sub-table) |
| Other STRUCTURAL audit-blocker rollups (regulations + Rule #15 + Rule #18 audit obligations) | 4 |
| **Bucket 1 total** | 16 |

#### Audit-obligation items folded into Bucket 1

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S13 | **Rule #18 audit (vendor names in commerce-shaped entities only)** | `description` field on `domains.SMM` reads "Cross-channel social media publishing, scheduling, engagement (unified inbox), listening, analytics, and influencer/advocacy programs. Distinct from MA (lifecycle marketing automation), CDP (customer data unification), and SALES-ENG (1:1 outbound sales engagement)." Inter-domain disambiguation in parentheses is fine (refers to other catalog domains, not vendors). No vendor names found; Rule #18 PASS. Same scan for the 7 capability descriptions: no vendor names. PASS. Surface for transparency. | No action; record pass. |
| B1-S14 | **Rule #15 audit (notes-pollution sweep)** | Five `domain_data_objects` rows for SMM (audience_segments, crm_leads, customers, crm_contacts, marketing_campaigns) carry populated `notes` describing the consumer / contributor relationship semantics. Three `domain_data_objects` rows (social_messages, social_mentions on the SMM side) also carry populated `notes` describing the inbox / off-channel split. Per Rule #15 these need to have been explicitly user-approved at load time or they get reverted. Two `data_object_relationships` rows (SMM social_messages/social_mentions -> CSM customer_cases) have empty notes (OK). Three `skill_tools` rows on the legacy skill have populated notes ("Posts published externally", "Mention sentiment is core SMM analytics", "AI-generated post imagery", "AI-generated post copy") — same Rule #15 obligation. | Surface to user (Bucket 2 covers the wording-approval question per Rule #15 -> see B2-S1 and B2-S3 below; B1 lists the obligation as a structural acknowledgment). |
| B1-S15 | **`domain_regulations` empty** | Zero `domain_regulations` for SMM. The market is regulated: FTC Influencer Disclosure (FTC Endorsement Guides), GDPR (consumer data via DMs and engagement signals), CCPA (same), COPPA (when under-13 users interact via social), EU DSA (for in-scope platforms). At a minimum FTC and GDPR should be linked with `applicability` set to `core` (FTC for `INFLUENCER-MGMT` capability surface) and `applicable` (GDPR for everything that touches PII). | Author 3-4 `domain_regulations` rows once user confirms which set the audit should load; the regulation rows likely exist in the catalog already from MA / CDP loads, so the work is the junction not the regulations themselves. |
| B1-S16 | **Per-domain neighbor pairwise summary (in-scope finding for SMM)** | Across the 4 heavy neighbors (CRM, CSM, CDP, MA — edge weight >=3 each), the catalog-implied missing handoffs are limited because most of the data flow is asymmetric (SMM publishes; consumers absorb). The one finding per pair specific to SMM: no consumer-side DMDO declared on any SMM master from any of the 4 neighbors. This is the B1-S9 catalog finding from the APM audit replicated for SMM: every domain that receives an SMM event is implicitly consuming a SMM master (`social_messages`, `social_mentions`, `social_posts`, `customers` contributor signals) without declaring the dependency. **Report-only** for the receiving domains (they will surface this in their own b1 audits' B8 sections). | Schedule b1 audits for CRM, CSM, CDP, MA to add the missing `consumer` DMDO rows on SMM masters. Not SMM's fix. |

### Bucket 2 — Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #15 notes-pollution on `domain_data_objects` rows for SMM (8 rows total: 5 cross-domain + 3 SMM-mastered with populated notes).** Were these notes user-approved during the original SMM Phase-B load, or were they auto-populated by the loader? Same obligation as APM-S2-S2. | Cannot tell from audit alone; the loader script for SMM ([scripts/loaders/load_smm_data_objects.ts](../scripts/loaders/load_smm_data_objects.ts) per SKILL reference) would carry the original text. | (a) Confirm user-approved at load time; leave in place. (b) Confirm auto-population; PATCH all 8 rows to empty string, record the relationship semantics in this audit file (the audit IS the approved persistence surface per Rule #15), and append a Rule-#15 incident to references/skill-changelog.md. |
| B2-S2 | **Rule #15 notes-pollution on 4 `skill_tools` rows** linked to the legacy `smm-system` skill (id 18): "Posts published externally to social network destinations", "Mention sentiment is core SMM analytics", "AI-generated post imagery", "AI-generated post copy". Same load-time approval question. If B1-S2 retires the legacy skill, the rows will be recreated under the new per-module system skills — the question is whether the new rows ship with empty notes or with the same prose. | Same as B2-S1; depends on whether the original load surfaced the prose for user approval. | (a) The prose was user-approved; carry forward verbatim to the new per-module skill_tools. (b) The prose was auto-written; do not carry forward. New per-module skill_tools rows ship with empty notes. |
| B2-S3 | **B4 pattern flag positive re-evaluation per Rule #12** — current flags on the 5 SMM masters are all-false. Candidates: should `social_posts.has_submit_lock=true` (scheduled posts should freeze once the schedule fires so the publishing engine has a stable surface)? should `social_posts.has_single_approver=true` (regulated industries / enterprise brands typically require a single sign-off on published copy)? should `social_messages.has_personal_content=true` (DMs and threaded conversations carry PII)? should `social_mentions.has_personal_content=true` (mentions carry the mentioner's handle and often profile info)? should `influencers.has_personal_content=true` (creator profiles include payment / tax / W-9 data)? | Pattern flags are workflow-shape judgments the user owns; the default false doesn't establish review. | Per-flag yes/no from user; the decisions are captured in this file's eventual Decisions section. |
| B2-S4 | **Module shape for `EMPLOYEE-ADVOCACY` capability.** SMM has 7 capabilities and the proposed B1-S1 module set covers 6 of them. `EMPLOYEE-ADVOCACY` (the curated-content-for-employee-sharing capability) is either (a) folded into SMM-PUBLISHING (the content originates there; advocacy is a downstream consumption pattern), (b) given its own SMM-ADVOCACY module (the data shape is genuinely distinct — employee_share_records, advocacy_program memberships, gamification leaderboards), or (c) split off from SMM entirely as a candidate domain (EMP-ADVOCACY is already queued in `_missing-domains.md` mention_count 2 — Hootsuite Amplify, Sprinklr Advocacy, Smarp, Bambu, EveryoneSocial, GaggleAMP, Oktopost). Path (a) keeps the module count at 4 and minimizes load; path (b) preserves the module floor cleanly; path (c) re-shapes the audit (this capability gets removed from SMM, the candidate domain enters Phase 0). | Editorial / market-classification decision; the point-solution-market test (Rule #2) returns YES for advocacy (GaggleAMP / Bambu / EveryoneSocial are independent vendors with flagship products in this space) but the catalog's existing convention is to keep capability + create the missing-domain candidate, then fold-into-existing when both surfaces are clearly siblings. | (a / b / c) — recommend (b) as a near-term cure (keeps the floor satisfied, preserves the capability in SMM) AND keeps the EMP-ADVOCACY queue entry alive for a deeper Phase 0 vetting later. |

### Bucket 3 — Phase 0 pending (speculative)

Market-audit semantic pass not yet run (this audit covers the structural 4-pass + APQC tagging; a deeper Phase 0 / market-surface subagent invocation is the next step on user request). Below are the candidate gaps surfaced from flagship-vendor knowledge during this audit pass; each is a candidate market that needs vetting via either formal Phase 0 vendor research OR user eyeball-mode.

| # | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-S1 | **`employee_share_records` master + advocacy module shape** (folds into B2-S4 (b)). The advocacy data shape — share events per employee, attribution back to brand, gamification points — is genuinely distinct from `social_posts`. | Hootsuite Amplify, Sprinklr Advocacy, GaggleAMP product docs. | If user picks B2-S4 (b), no Phase 0 vetting needed; the entity surface is well-known. If user picks B2-S4 (c), formal Phase 0 against the EMP-ADVOCACY candidate domain. |
| B3-S2 | **Influencer-management workflow substrate: `influencer_contracts`, `influencer_deliverables`, `influencer_briefs`, `influencer_payments`.** The current `influencers` master is a relationship record, not the workflow. Flagship influencer-platforms (CreatorIQ, Aspire, Grin) model the workflow as: discovery -> brief -> contract -> deliverables review -> payment. Today SMM-INFLUENCER (proposed module) would master only the relationship, not the workflow substrate. Two paths: (a) extend SMM-INFLUENCER with the 4 missing masters (deepens SMM's coverage), or (b) defer to a separate INFLUENCER-MGMT domain (queued in `_missing-domains.md` mention_count 2, vendor evidence CreatorIQ / Aspire / Grin / Klear / Upfluence / Mavrck / Traackr — passes the point-solution-market test). | CreatorIQ, Aspire, Grin Workbench, Mavrck product docs. | Path (a) is cheap (4 entities + lifecycle states); path (b) needs formal Phase 0 + vendor surface matrix per the `_missing-domains.md` queue entry. Recommendation: path (b) — the influencer-management market is mature with pure-play flagship vendors and the catalog has the queue entry already. |
| B3-S3 | **Social listening domain substrate: `listening_queries`, `listening_alerts`, `share_of_voice_snapshots`, `competitor_mentions`, `crisis_detection_signals`.** Brandwatch / Talkwalker / Meltwater model these as distinct entities; today `social_listening_topics` collapses query, alert, share-of-voice, and crisis surface into one master. SOCIAL-LISTENING is queued in `_missing-domains.md` mention_count 2. Two paths: (a) extend SMM-LISTENING with the 4 missing masters, or (b) defer to a separate SOCIAL-LISTENING domain (passes point-solution-market test). | Brandwatch, Talkwalker, Meltwater Engage product docs. | Same shape as B3-S2: path (a) cheap; path (b) needs formal Phase 0. Recommendation: path (b) — Brandwatch alone has 5+ flagship-level vendors competing pure-play. |
| B3-S4 | **Paid social orchestration substrate: `paid_social_campaigns`, `social_ad_creatives`, `ad_targeting_segments`, `ad_budget_pacing_records`, `ad_creative_variants`.** Smartly.io, Sprinklr Ads, AdEspresso, Madgicx model paid-social as a distinct workflow on top of organic social. Today SMM has no paid-social entities. SOCIAL-ADS is queued in `_missing-domains.md` mention_count 2. Two paths: (a) extend SMM-PUBLISHING with paid-ad entities, or (b) defer to SOCIAL-ADS domain (passes point-solution-market test). Strong adjacency to ADV-AD-TECH. | Smartly.io, Sprinklr Ads, AdEspresso, Madgicx product docs. | Recommendation: path (b) — paid-social orchestration is a distinct point-solution market with strong vendor signal. |

### Cross-bucket dependencies

- **B2-S4 (EMPLOYEE-ADVOCACY module shape) is dependent on Bucket 3 (B3-S1).** Picking path (c) — split EMP-ADVOCACY as a candidate domain — kicks Bucket 2 over to a Phase 0 outcome. Picking path (a) or (b) keeps B2-S4 independent. Suggest the user resolves Bucket 3 first (or at least picks the path on B3-S1) before answering B2-S4.
- **B1-S2 (legacy skill retirement) is dependent on B1-S1** (modules must exist before per-module system skills can be authored).
- **B1-S3 (lifecycle states) is independent of B1-S1**; states can be loaded for masters without modules, but the workflow-gate states' `domain_module_id` FK can only be patched correctly after B1-S1. Sequencing: B1-S1 -> B1-S3 -> patch the gate states' `domain_module_id`.
- **B1-S7 (missing events) is dependent on B1-S3** (events ride on the states).
- **B1-S9 (B10b NULL backfill) is dependent on B1-S1**; the backfill derivation needs the module set.
- **B1-S10 (event-attribution defect) is independent of B1-S1** but the fix shape — replacement events on SMM masters — should land after B1-S1 so the `source_domain_module_id` derivation works correctly post-fix.
- **B2-S1 / B2-S2 (Rule #15 notes pollution) are independent of all other items.** The question is load-time approval, not market or module shape.
- **B2-S3 (pattern flag positive re-evaluation) is independent of Bucket 3.** Even if a flag's reasoning relates to PII handling, the flag itself is per-master and doesn't depend on the speculative entity sets in Bucket 3.

### Per-bucket prompts

**Bucket 1 — fix these now?** Reply with: `all`, or list (e.g. `S1, S3, S4, S12`), or `skip`.

- **S1 (M1 hard fail — author 4 or 5 `domain_modules` rows for SMM):** this is the gating cure for almost everything else. Recommend resolving first.
- **S2 (F1 — retire legacy `smm-system` skill once S1 lands):** mechanical once S1 ships.
- **S3 (B12 — load lifecycle states for 5 masters):** can land independently of S1 but the gate states' `domain_module_id` is patched post-S1.
- **S4 (B7 — load 6-10 users edges):** mechanical Rule #10 fix.
- **S5 (B6 — load 4 intra-domain relationships):** mechanical.
- **S6 (B9 enum PATCH on 3 events):** trivial.
- **S7 (B9 missing events):** sequenced after S3.
- **S8 (B6/B8 cross-domain relationships):** 4-5 rows.
- **S9 (B10b post-S1 backfill):** dependent on S1.
- **S10 (event-attribution defect):** user judgment on re-targeting vs DELETE-and-replace.
- **S11 (B11 — load 12-18 aliases):** mechanical bulk insert.
- **S12 (APQC TAGGING — 8 agent_curated rows above):** fixed PCF ids on 6, lookup-needed on 2 (handoffs 90, 91). Load now or in follow-up batch?
- **S13 (Rule #18 audit pass):** no action; pass.
- **S14 (Rule #15 incident — folded into B2-S1/B2-S2):** answer in Bucket 2 first.
- **S15 (domain_regulations empty — load FTC + GDPR + CCPA + COPPA + DSA junctions):** which set? See B2 if you'd rather treat as judgment.
- **S16 (consumer DMDOs owed by 4 receiving domains):** schedule b1 audits for CRM, CSM, CDP, MA; not SMM's fix.

**Bucket 2 — what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 / B2-S2 (Rule #15 notes-pollution):** the audit can revert if you confirm auto-population. If approved, say so and I leave them.
- **B2-S3 (pattern flags):** per-flag yes/no across the 5 candidates.
- **B2-S4 (EMPLOYEE-ADVOCACY module shape):** (a) fold into SMM-PUBLISHING, (b) author SMM-ADVOCACY module, or (c) split as candidate domain EMP-ADVOCACY.

**Bucket 3 — Phase 0 pending — vet via formal Phase 0 vendor research or eyeball-mode?** For each of B3-S1 through B3-S4: which path do you prefer, and which candidates ring true for eyeball-mode promotion to Bucket 1?

### Report-only follow-ups (owed by other domains)

- **CRM B8 / DMDO owes consumer rows on SMM masters.** CRM-LEAD-MGT module 47 receives `social_lead.captured` via handoff 88 but does not declare a `consumer` row on `social_messages` (the master the lead is qualified from). Surface in CRM's next b1 audit's B8.
- **CSM B8 / DMDO owes consumer rows on SMM masters.** CSM-CASE-MGMT module 112 receives `social_message.received` (handoff 86), `social_mention.detected` (handoff 87), `social_listening_topic.alert` (handoff 511) but does not declare consumer rows on `social_messages` or `social_mentions`. CSM's next b1 audit's B8.
- **CDP B8 / DMDO owes consumer rows on SMM masters.** CDP receives `social_engagement.recorded` (handoff 89) but does not declare a consumer row on `social_messages` or `social_mentions`. CDP's next b1 audit's B8.
- **MA B8 / DMDO owes consumer rows on SMM masters.** MA receives `influencer_campaign.completed` (handoff 90) and `social_post.published` (handoff 91) but does not declare consumer rows on `social_posts` or `influencers`. MA's next b1 audit's B8.
- **MA M1 (likely)** — `marketing_campaigns` (id 116) has zero rows in `domain_module_data_objects` despite being the canonical master per the legacy `domain_data_objects` rollup. MA may share SMM's "no modules loaded" defect; schedule MA b1 audit to confirm.
- **B10b backfill** — the 5 inbound-side `target_domain_module_id` NULLs on outbound rows targeting CSM (86, 87, 511), CDP (89), and MA (90, 91) await each target domain's b1 audit / B10b backfill. CRM target (88, 512) is already populated. Not SMM's fix.

### Candidates queued to `audits/_missing-domains.md`

| Code | First-mention status | Action this run |
|---|---|---|
| INFLUENCER-MGMT | previously queued | bumped mention_count |
| EMP-ADVOCACY | previously queued | bumped mention_count |
| SOCIAL-LISTENING | previously queued | bumped mention_count |
| SOCIAL-ADS | previously queued | bumped mention_count |
| UGC-MGMT | new | added |

## 2026-05-31, Continuation: B1 technical fixes

Applied only the truly-technical Bucket 1 items via [.tmp_deploy/fix_smm_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_smm_b1_technical_2026_05_31.ts). All other B1 items remain open pending user judgment.

### Applied

- **B1-S6** PATCH `trigger_events.event_category` on 3 rows whose category the audit pre-specifies:
  - id 522 `social_account.connected`: `''` -> `lifecycle`
  - id 523 `social_listening_topic.alert`: `''` -> `signal`
  - id 524 `influencer.engagement_recorded`: `''` -> `signal`
- **B1-S12 (partial, 6 of 8)** INSERT `handoff_processes` rows for the handoffs whose audit-proposed PCF resolves cleanly. All inserts use `proposal_source='agent_curated'`, `role='implements'`, `record_status='new'`, `notes=''`:
  - handoff 86 -> process 674 (PCF 16627 L4 "Monitor and respond to social media activity")
  - handoff 87 -> process 674 (PCF 16627 L4)
  - handoff 88 -> process 708 (PCF 10189 L4 "Identify/receive leads/opportunities")
  - handoff 89 -> process 138 (PCF 16613 L3 "Analyze and respond to customer insight")
  - handoff 511 -> process 674 (PCF 16627 L4)
  - handoff 512 -> process 138 (PCF 16613 L3)

### Deferred (still open in Bucket 1)

- **B1-S1, B1-S2, B1-S3, B1-S4, B1-S5, B1-S7, B1-S8, B1-S9, B1-S10, B1-S11**: each requires new entities, new modules, exact-tuple specification, dependent sequencing, or user judgment that the agent's technical mandate explicitly excludes.
- **B1-S12 (handoffs 90, 91)**: the audit itself flags "needs PCF re-lookup at fix time" for `influencer_campaign.completed` -> MA and `social_post.published` -> MA. Re-search and final PCF assignment for these two left open.
- **B1-S13** pass, no action required.
- **B1-S14** notes-pollution sweep folds into B2-S1 / B2-S2 (user judgment).
- **B1-S15** `domain_regulations` empty: audit asks "which set" (FTC / GDPR / CCPA / COPPA / DSA), so picking the loadable subset is a user call.
- **B1-S16** report-only, owed by CRM / CSM / CDP / MA b1 audits.

Spot-check URLs:

- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

- **Domain id:** 106. **Masters:** 125 `social_posts`, 126 `social_accounts`, 127 `social_messages`, 128 `social_mentions`, 129 `social_listening_topics`, 130 `influencers`.
- **Current footprint vs 2026-05-30:** still **zero `domain_modules` rows** (M1 hard fail persists, no fixes loaded for B1-S1). Phase-A metadata on `domains` intact (`crud_percentage=78`, `min_org_size=10 xs <50`, `cost_band=$$`, `usa_market_size_usd_m=2500`, `market_size_source_year=2024`). **A4 hard fail uncovered this pass:** `domains.catalog_tagline` and `domains.catalog_description` both empty (Rule #20).
- **B1-S6 confirmed applied:** 3 events (522 `social_account.connected`=lifecycle, 523 `social_listening_topic.alert`=signal, 524 `influencer.engagement_recorded`=signal) now carry valid `event_category`. **B1-S12 confirmed applied for 6/8 handoffs:** 86, 87, 88, 89, 511, 512 now carry `handoff_processes` rows (`agent_curated`, `new`). 90, 91 still untagged (deferred — needs PCF re-lookup at fix time per prior audit).
- **Bucket counts:** Bucket 1 (in-scope, agent fixable): 13 PENDING items (10 carried from prior + A4 + 2 newly-observed). Bucket 2 (surface-for-user, judgment): 5 items (4 prior + 1 new on `parent_domain_id`). Bucket 3 (Phase 0 pending, speculative): 4 items (unchanged).
- **Headline:** M1 hard fail still gates M2/M4/M5/M6/M7/M8 vacuously, plus E1-E6 (no modules to author roles against) and F2-F5 (no module-level system skills). B7 (zero `users` edges), B11 (zero aliases), B12 (zero lifecycle states across all 6 masters), B6 (zero intra-domain `data_object_relationships`), and B8 (4-5 missing cross-domain edges) all remain hard / partial fail.

### Structural pass — per-band findings

**S-band coverage sweep.**

| Table | FK column | SMM rows | Notes |
|---|---|---|---|
| `domain_data_objects` | `domain_id` | 11 | 6 master + 3 contributor + 2 consumer |
| `solution_domains` | `domain_id` | 12 | 10 primary + 2 partial |
| `business_function_domains` | `domain_id` | 1 | owner only (Marketing Communications); no contributors / consumers |
| `capability_domains` | `domain_id` | 7 | all 7 SMM capabilities |
| `domain_regulations` | `domain_id` | 0 | B1-S15 carryover |
| `handoffs` | `source_domain_id` | 8 | per prior audit |
| `handoffs` | `target_domain_id` | 0 | inbound: zero (report-only B10) |
| `domain_modules` | `domain_id` | 0 | M1 hard fail |
| `domain_module_host_domains` | `domain_id` | 0 | OK (no cross-cutting hosts on SMM) |
| `skills` | `domain_id` | 1 | legacy `smm-system` (id 18), `domain_module_id=null` (F1) |
| `domain_aliases` | `domain_id` | 0 | acceptable (universal-synonym surface, optional) |
| `domains.parent_domain_id` | self | parent=69 (CRM) | suspect — see B2-S5 |

S2 per-module coverage is vacuous (zero modules). S3 per-master coverage: every master returns zero `data_object_lifecycle_states` and zero `data_object_aliases`; trigger_events present for 5/6 masters (none on 125 has a `scheduled`/`failed`; 126 has 1; 127 has 1; 128 has 1; 129 has 1; 130 has 1).

**A-band.** A1 pass. A2 pass (7 caps). A3 pass (12 solutions, 10 primary). **A4 fail** — both `catalog_tagline` and `catalog_description` empty (Rule #20 backfill obligation; surface draft to user before write).

**M-band.** M1 hard fail (zero modules). M2/M4/M5/M6/M7/M8 vacuously fail until M1 resolves.

**B-band.**
- B5: vacuously pass (zero `embedded_master` rows on SMM).
- B6: hard fail — zero intra-domain edges across all 6 masters (B1-S5 carryover).
- B7: hard fail — zero `users` edges either direction (B1-S4 carryover).
- B8: partial fail — 2 cross-domain edges exist (127→103, 128→103, both `triages into` CSM `customer_cases`); 4-5 missing per B1-S8.
- B9: 6 events present; B1-S6 fix confirmed in place. Missing events for lifecycle states still pending B1-S3.
- B9b: vacuous (M1 gates; zero `domain_modules` means no cross-module surface within SMM).
- B10b: all 8 outbound rows still NULL on `source_domain_module_id` (currently legitimate while M1 unresolved). Inbound side: 88 → target_module 47 (CRM-LEAD-MGT) populated; 512 → target_module 46 populated; 86, 87, 89, 90, 91, 511 still NULL on `target_domain_module_id` — report-only against CSM (3) / CDP (1) / MA (2). New finding this pass: handoff 511 has trigger event 523 whose `data_object_id=129` (`social_listening_topics`, SMM-mastered) but `handoffs.data_object_id=128` (`social_mentions`, also SMM-mastered) — this is a same-domain trigger-vs-payload split, not the cross-domain attribution defect B1-S10 covers; no new fix needed but worth surfacing (see B2-S5b new). Handoffs 88/89/90/512 still carry the B1-S10 event-attribution defect (trigger event data_object mastered by target).
- B10: zero inbound rows; nothing owed by this domain. Discovery candidates (cross-domain SMM contributor/consumer surfaces): customers (97) is mastered by CRM/CSM/SUB-MGMT/CDP/MDM (multi-master situation), crm_contacts (98) by CRM, crm_leads (99) by CRM, marketing_campaigns (116) by MA, audience_segments (113) by CDP — each owner domain's outbound handoff list does not include SMM as a target, so they all owe outbound on lifecycle transitions of these shared records. Report-only against CRM / MA / CDP.
- B11: hard fail — zero aliases (B1-S11 carryover).
- B12: hard fail — zero lifecycle states across all 6 masters (B1-S3 carryover).

**C-band.** C1 partial — 1 owner row (Marketing Communications); typical pattern adds 1-2 contributors (Customer Service for engagement/inbox; Sales for lead routing). C2 not applicable until contributors load.

**D-band.** D1 not applicable (no fresh write this pass).

**E-band.** E1-E6 vacuously fail (M1 gates — no modules to author `role_modules` against).

**F-band.** F1 fail — legacy `smm-system` skill (id 18) persists with `domain_module_id=null`; acceptable transitional state only until F2 lands. F2-F5 vacuously fail until M1 resolves and per-module system skills land. F7 pass on the legacy skill (no channel primitives linked; `respond_to_social_mention` is a `mutate` against `social_mentions`, not a channel primitive).

**H-band.** **H1 partial.** 6/8 cross-domain handoffs carry `handoff_processes` rows (`agent_curated`, `new` — never approved). 2/8 (handoffs 90 `influencer_campaign.completed` → MA; 91 `social_post.published` → MA) still untagged; prior audit deferred these for PCF re-lookup. Quality measure (approved): 0/8. Process measure (agent_curated coverage): 6/8 = 75% — meets the 0.5N-0.8N volume target. The 2 deferred handoffs become a fixable Bucket-1 follow-up once PCF lookup resolves; otherwise they belong in the gap report as B1A pending.

### Bucket 1 — in-scope confirmed gaps (PENDING)

Items carried verbatim from 2026-05-30 audit; new items appended with B1-2026-05-31-X prefix.

| ID | Source | Band | Status | Block dep |
|---|---|---|---|---|
| B1-S1 | 2026-05-30 | M1 | pending — gating | none |
| B1-S2 | 2026-05-30 | F1 | pending | B1-S1 |
| B1-S3 | 2026-05-30 | B12 | pending | independent (gate-state `domain_module_id` after B1-S1) |
| B1-S4 | 2026-05-30 | B7 | pending | none |
| B1-S5 | 2026-05-30 | B6 | pending | none |
| B1-S7 | 2026-05-30 | B9 missing events | pending | B1-S3 |
| B1-S8 | 2026-05-30 | B6/B8 | pending | none (but cleanest after B1-S10) |
| B1-S9 | 2026-05-30 | B10b backfill | pending | B1-S1 |
| B1-S10 | 2026-05-30 | B9 event-attribution defect | pending | independent shape; fix shape after B1-S1 |
| B1-S11 | 2026-05-30 | B11 aliases | pending | none |
| B1-2026-05-31-A | new this pass | A4 (Rule #20) | pending | none |
| B1-2026-05-31-B | new this pass | H1 (handoffs 90, 91 PCF tag) | pending | external PCF re-lookup |
| B1-2026-05-31-C | carry-forward S15 | `domain_regulations` empty | pending | folds with B2 if user prefers judgment |

**B1-2026-05-31-A — A4 catalog UX fields empty (Rule #20).** `domains.catalog_tagline` and `domains.catalog_description` both empty string. Per Rule #20: draft both per the buyer-voice voice rule (workflow + value, NOT analyst voice — `domains.description` already carries the analyst copy), surface to user for review BEFORE writing. Module-level M8 vacuously passes until M1 resolves; once modules land, repeat A4 per-module under M8.

**B1-2026-05-31-B — H1 residual (handoffs 90, 91).** PCF re-lookup against APQC PCF Cross-Industry for `Develop and manage brands (11445 L3)` children and `Manage advertising and customer communications` family to find an L4 that cleanly maps to `influencer_campaign.completed` and `social_post.published` paid-amplification semantics. If no clean L4 exists, defer to Discover Pass 3 custom-process authoring (do NOT silently leave untagged).

### Bucket 2 — surface-for-user (judgment calls)

| ID | Source | Question |
|---|---|---|
| B2-S1 | 2026-05-30 | Rule #15 notes-pollution on 8 `domain_data_objects` rows — user-approved at load time or auto-populated? |
| B2-S2 | 2026-05-30 | Rule #15 notes-pollution on 4 `skill_tools` rows on legacy skill 18 — same load-time approval question; if reverted, do the new per-module rows ship with empty notes? |
| B2-S3 | 2026-05-30 | B4 pattern-flag positive re-evaluation: candidates `social_posts.has_submit_lock`, `social_posts.has_single_approver`, `social_messages.has_personal_content`, `social_mentions.has_personal_content`, `influencers.has_personal_content`. |
| B2-S4 | 2026-05-30 | `EMPLOYEE-ADVOCACY` module shape — (a) fold into SMM-PUBLISHING, (b) author SMM-ADVOCACY, (c) split as EMP-ADVOCACY candidate domain. Depends on B3-S1. |
| B2-S5 | new this pass | `domains.parent_domain_id=69 (CRM)` — is SMM legitimately a child of CRM, or is this a legacy artifact from the pre-modular era? SMM is not commonly modeled as a CRM sub-domain in flagship vendor taxonomies (Hootsuite, Sprout, Sprinklr position SMM as a sibling of CRM, not a child). Options: (a) PATCH `parent_domain_id` to NULL, (b) re-parent to a different leadership domain (e.g. MARTECH leadership tier if one exists), (c) confirm CRM parent intentional. |

### Bucket 3 — Phase 0 pending (speculative)

All four items carried forward verbatim from 2026-05-30 audit. Status: none vetted via formal Phase 0 yet.

- B3-S1 (`employee_share_records` master + advocacy module shape; depends on B2-S4)
- B3-S2 (Influencer-management workflow substrate: `influencer_contracts`, `influencer_deliverables`, `influencer_briefs`, `influencer_payments`)
- B3-S3 (Social listening domain substrate: `listening_queries`, `listening_alerts`, `share_of_voice_snapshots`, `competitor_mentions`, `crisis_detection_signals`)
- B3-S4 (Paid social orchestration substrate: `paid_social_campaigns`, `social_ad_creatives`, `ad_targeting_segments`, `ad_budget_pacing_records`, `ad_creative_variants`)

### Report-only follow-ups (owed by other domains)

- **CRM B8 / DMDO** owes consumer rows on `social_messages` (handoff 88).
- **CSM B8 / DMDO** owes consumer rows on `social_messages` (86), `social_mentions` (87, 511).
- **CDP B8 / DMDO** owes consumer row on `social_mentions` or `social_messages` (89).
- **MA B8 / DMDO** owes consumer rows on `social_posts` and `influencers` (90, 91). Also: MA module-level M1 likely fails (`marketing_campaigns` has zero DMDO rows per prior audit); schedule MA b1 audit.
- **B10b target-side backfill** owed by CSM (86, 87, 511), CDP (89), MA (90, 91). CRM target rows 88 + 512 are already populated.

### Per-bucket prompts

- **Bucket 1:** approve all / list (e.g. `S1, S3, A` for B1-2026-05-31-A) / skip. **S1 remains the gating cure for almost everything else.**
- **Bucket 2:** per-item decision required (notes-pollution wording per Rule #15; pattern-flag yes/no; advocacy module shape; `parent_domain_id`).
- **Bucket 3:** vet via Phase 0 vendor research, or eyeball-mode? B2-S4 + B3-S1 are linked.

### Classification (b1a / b1b / b2 / b3)

- **b1a** (agent-solvable, no other blocker): B1-S4 (B7), B1-S5 (B6), B1-S11 (B11), B1-2026-05-31-A (A4 draft + surface), B1-2026-05-31-B (H1 PCF re-lookup).
- **b1b** (blocked): B1-S1 (gates everything downstream — no inter-domain blocker, but a structural prerequisite that needs user judgment on module shape; classifies as b2 here because module-set choice is editorial, not mechanical — see note below). B1-S2 (blocked_by B1-S1). B1-S3 (technically independent but gate-state `domain_module_id` patch is post-S1; depends_on B1-S1 for the gate-anchoring step). B1-S7 (blocked_by B1-S3). B1-S8 (blocked_by B1-S10 for cleanest shape). B1-S9 (blocked_by B1-S1). B1-S10 (independent shape but fix lands after B1-S1). B1-2026-05-31-C (`domain_regulations`) blocked on user's regulation-set choice (folds with B2).
- **b2** (user judgment): B1-S1 (module shape is editorial — re-classified from B1A to b2 because the 4-vs-5 module decision is what gates everything else and is a user call), B2-S1, B2-S2, B2-S3, B2-S4, B2-S5.
- **b3** (vendor research pending): B3-S1, B3-S2, B3-S3, B3-S4.

### Cross-bucket dependencies

- **B2-S4 ↔ B3-S1** (advocacy module shape ↔ `employee_share_records`).
- **B1-S1 (M1 cure) → B1-S2, B1-S9** (mechanical cascade post-S1).
- **B1-S3 (lifecycle states) → B1-S7** (events ride states); gate-state `domain_module_id` patches are post-S1.
- **B1-S10 (event-attribution defect) ↔ B1-S8** (clean cross-domain relationship shape needs the re-targeted events first).

### Spot-check URLs

- https://tests.semantius.app/domain_map/domains
- https://tests.semantius.app/domain_map/domain_modules
- https://tests.semantius.app/domain_map/handoffs
- https://tests.semantius.app/domain_map/handoff_processes
- https://tests.semantius.app/domain_map/data_object_lifecycle_states
- https://tests.semantius.app/domain_map/data_object_aliases

---

## 2026-06-02 Audit (modularization)

Built the SMM domain's module set from scratch. Domain 106 had zero `domain_modules` (M1 hard fail per every prior audit). This pass authors the 4-module shape that the prior B2-MODULE-SHAPE proposal recommended (path a: fold EMPLOYEE-ADVOCACY into SMM-PUBLISHING as the cheapest cure that keeps the capability in SMM). Scope was modules + capability links + entity assignment ONLY: no new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created. Existing entities reused at their existing roles.

### Modules created (all module_kind=full)

- **SMM-PUBLISHING** (id 299) Social Publishing and Planning. Masters `social_posts` (125), `social_accounts` (126). Capabilities SOCIAL-PUB (125), CONTENT-CAL (129), EMPLOYEE-ADVOCACY (131), SOCIAL-ANALYTICS (128). Borrowed: `marketing_campaigns` (116, contributor), `audience_segments` (113, consumer).
- **SMM-ENGAGEMENT** (id 300) Social Engagement Inbox. Master `social_messages` (127); embedded_master `social_accounts` (126). Capability SOCIAL-ENGAGE (126). Borrowed: `customers` (97, contributor), `crm_contacts` (98, contributor), `crm_leads` (99, consumer).
- **SMM-LISTENING** (id 301) Social Listening and Monitoring. Masters `social_mentions` (128), `social_listening_topics` (129). Capability SOCIAL-LISTEN (127).
- **SMM-INFLUENCER** (id 302) Influencer and Creator Programs. Master `influencers` (130). Capability INFLUENCER-MGMT (130). Borrowed: `marketing_campaigns` (116, contributor).

### Master placement (each master in exactly one module, in-domain AND catalog-wide)

Catalog-wide master pre-check ran BEFORE writing any `role=master` (query `/domain_module_data_objects?data_object_id=in.(125,126,127,128,129,130)&role=eq.master`): returned ZERO existing master rows. So all six in-domain masters were free to master here; no demotions were forced by the pre-check. Final mapping:

| data_object | id | mastering module |
| --- | --- | --- |
| social_posts | 125 | SMM-PUBLISHING (299) |
| social_accounts | 126 | SMM-PUBLISHING (299) |
| social_messages | 127 | SMM-ENGAGEMENT (300) |
| social_mentions | 128 | SMM-LISTENING (301) |
| social_listening_topics | 129 | SMM-LISTENING (301) |
| influencers | 130 | SMM-INFLUENCER (302) |

`social_accounts` (126) is single-mastered in SMM-PUBLISHING and assigned `embedded_master` (not a second master) in SMM-ENGAGEMENT, which needs the account context for the inbox. M7 holds in-domain and catalog-wide.

### Structural checks (verified live post-load)

- Rule #14: 7 capabilities require >=2 full modules; shipped 4. PASS.
- M4: all 7 capabilities placed in exactly one module each. PASS.
- M6: every module has >=1 capability. PASS.
- No empty module: every module has >=1 data_object. PASS.
- M7: each of the 6 masters appears exactly once with role=master (re-checked catalog-wide). PASS.
- Borrowed rows (113, 116, 97, 98, 99) preserved existing role + necessity from `domain_data_objects`; no master promoted. PASS.
- R1 record_status omitted, R15 notes omitted on every DMC + DMDO, R18 no vendor/product names in module name/description.

### What this unblocks

The module ids now exist, so the cascade items that were `blocked_by: B2-MODULE-SHAPE` (lifecycle-state gate anchoring, source_domain_module_id backfill, event re-attribution, per-module system skills) are mechanically unblocked except where they carry an independent user_decision or depends_on. B2-MODULE-SHAPE is resolved by this build (path a chosen); B2-S4-EMP-ADVOCACY resolved by folding EMPLOYEE-ADVOCACY into SMM-PUBLISHING. The 4 Bucket-3 candidate-domain / substrate questions (B3-EMPLOYEE-SHARE-RECORDS, B3-INFLUENCER-WORKFLOW, B3-SOCIAL-LISTENING-SUBSTRATE, B3-PAID-SOCIAL) remain open as deferred research; this modularization deliberately did not fill them.

### Deferred / out of scope this pass

- Per-module system skills (Rule #17 -> F2/F3): legacy skill `smm-system` (id 18, domain_module_id=null) still carries all 12 skill_tools. Now that 4 module anchors exist, it should be retired and split into per-module system skills. Tracked b1a (B1A-F2-PER-MODULE-SKILLS).
- Catalog UX (M8/A4): `domains.catalog_tagline` + `catalog_description` still empty on row 106. Tracked b1a (B1A-A4-CATALOG-UX), surface-before-write.
- Missing-master research (b3): the 4 substrate / candidate-domain questions above remain Phase-0 research.

## 2026-06-06 - b1a execution

Executed all 6 `b1a` items against the live `domain_map` module for SMM (domain 106). All writes
landed `record_status='new'` (omitted on insert) and every `notes` column left empty per Rule #15.
Loaders: [.tmp_deploy/fix_smm_b1a_2026_06_06.ts](../.tmp_deploy/fix_smm_b1a_2026_06_06.ts) (B6/B7/B11),
[.tmp_deploy/fix_smm_f2_skills_2026_06_06.ts](../.tmp_deploy/fix_smm_f2_skills_2026_06_06.ts) (F2).

### B1A-A4-CATALOG-UX — DONE (Rule #20 revised: write empty fields directly)

PATCH `domains` id 106. Both `catalog_tagline` and `catalog_description` were empty (empty-guard
passed); wrote buyer-voice copy (workflow + value, no vendor/product names, no em-dashes) directly
into the empty columns. `record_status` stayed `new` (carries the review signal; reviewed in the
catalog UI, not parked in this file). `domains.description` (analyst voice) left untouched.

### B1A-B7-USERS-EDGES — DONE (Rule #10)

INSERT 8 `data_object_relationships` rows, `users` (748) -> SMM masters, all
`relationship_kind=reference`, `relationship_type=one_to_many`, `owner_side=source`, `is_required=false`:
- 2075 users authors social_posts (125); 2076 users schedules social_posts; 2077 users approves social_posts
- 2078 users responds_to social_messages (127); 2079 users owns social_accounts (126)
- 2080 users manages_relationship_with influencers (130); 2081 users owns social_listening_topics (129)
- 2082 users is_assigned social_mentions (128)

### B1A-B6-INTRA-RELS — DONE

INSERT 4 intra-domain `data_object_relationships` rows (all `reference`, `one_to_many`,
`owner_side=source`, `is_required=false`):
- 2071 social_accounts (126) publishes social_posts (125)
- 2072 influencers (130) authors social_posts (125)
- 2073 social_listening_topics (129) matches social_mentions (128)
- 2074 social_accounts (126) receives social_messages (127)

### B1A-B11-ALIASES — DONE

INSERT 15 `data_object_aliases` rows, `alias_type='synonym'`, `is_preferred=false` (the live enum is
`synonym` / `industry_term` / `solution_term`; the state.yaml `vendor_specific` / `industry_synonym`
labels are stale; mapped to `synonym` since no concrete `solution_id` was pinned per alias):
- social_messages (127): 1124 Conversations, 1125 Inbox Threads, 1126 Cases
- social_mentions (128): 1127 Brand Mentions, 1128 Buzz Items
- social_posts (125): 1129 Updates, 1130 Drafts, 1131 Scheduled Posts
- social_accounts (126): 1132 Profiles, 1133 Connected Channels
- social_listening_topics (129): 1134 Queries, 1135 Smart Folders, 1136 Themes
- influencers (130): 1137 Creators, 1138 Talent

### B1A-F2-PER-MODULE-SKILLS — DONE (Rule #17)

INSERT 4 `skills` rows (`skill_type='system'`, `domain_id=106`, `domain_module_id` per module).
NOTE: the platform rule `domain_required_when_skill_type_is_system` forced `domain_id` to be set on
each system skill even though `domain_module_id` is the new anchor; set both.
- 358 smm_publishing_agent (module 299); 359 smm_engagement_agent (module 300)
- 360 smm_listening_agent (module 301); 361 smm_influencer_agent (module 302)

INSERT 14 `skill_tools` rows, redistributing the 12 existing `tools` (reused, no new tools authored)
plus `query_social_accounts` and `detect_sentiment` linked to two skills each. All `notes` empty
(B2-NOTES-SKILLTOOLS resolved the Rule-#15-compliant way: new rows ship with empty notes; the prose
on legacy tools 267/55/48/49 was not carried forward):
- 358 publishing: query_social_posts, create_social_post, query_social_accounts, post_social_message
  (all required) + generate_image, generate_text (optional)
- 359 engagement: query_social_messages, query_social_accounts, detect_sentiment (all required)
- 360 listening: query_social_mentions, respond_to_social_mention, query_social_listening_topics,
  detect_sentiment (all required)
- 361 influencer: query_influencers (required)

DELETE legacy skill 18 (`smm-system`) and its 12 skill_tools. Prior values snapshotted here for
reversibility:
- skills row 18: `skill_name=smm-system`, `skill_type=system`, `domain_id=106`, `domain_module_id=null`,
  `record_status=new`, description "System skill for Social Media Management - post scheduling,
  listening, response workflows; posts published to external social platforms; mention sentiment
  scored via compute."
- skill_tools (id -> tool_id, requirement, notes): 228->228 query_social_posts req ""; 229->229
  query_social_messages req ""; 230->230 query_social_mentions req ""; 231->231 query_social_accounts
  req ""; 232->232 query_influencers req ""; 233->233 query_social_listening_topics req ""; 234->259
  create_social_post req ""; 235->260 respond_to_social_mention req ""; 236->267 post_social_message
  req "Posts published externally to social network destinations"; 237->55 detect_sentiment req
  "Mention sentiment is core SMM analytics"; 238->48 generate_image opt "AI-generated post imagery";
  239->49 generate_text opt "AI-generated post copy".

### B1A-H1-PCF-RELOOKUP — DONE (re-point, not insert)

Re-lookup finding: handoffs 90 and 91 were NOT untagged as the prior audit recorded. Both already
carried `handoff_processes` rows pointing at process 23 ("Develop and manage marketing plans", PCF
20008, L2) - a coarse L2 tag. PCF re-search of the advertising / brand / promotion family found a
confident L4 match for both paid-amplification / channel-execution handoffs: process 665 "Execute
promotional activities" (PCF 10169, L4) under "Develop and manage promotional activities" (20010 L3).
PATCH both rows from process 23 -> 665, keeping `proposal_source=agent_curated`, `record_status=new`,
`role=implements`, notes empty:
- handoff_processes 1030 (handoff 90 influencer_campaign.completed -> MA): process 23 -> 665
- handoff_processes 1031 (handoff 91 social_post.published -> MA): process 23 -> 665

All 8 SMM cross-domain handoffs now carry a `handoff_processes` row (6 at L4/L3 from the 2026-05-31
pass, 2 re-pointed to L4 this pass). H1 quality measure (approved) stays 0/8 by design (Rule #1).

### Skipped / blocked

None. All 6 b1a items fully resolved. (b1b items remain blocked on their `user_decision` /
`depends_on` gates; b2 user-judgment and b3 vendor-research items untouched.)

### Verified live counts (post-load)

- `data_object_relationships` touching SMM masters/users: 690 (was 678; +12 = 4 intra + 8 users).
- `data_object_aliases` on the 6 SMM masters: 15 (was 0).
- `skills` with `domain_module_id in (299,300,301,302)`: 4 system skills, each with >=1 skill_tools
  (6/3/4/1). Legacy skill 18 gone.
- `handoff_processes` for handoffs 90/91: 2 rows, both -> process 665.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.

---

## 2026-06-13 - B9d verify (B1A-B9D-VERIFY executed)

Ran the committed B9d resolver in BOTH directions for SMM (domain 106):
`bun run scripts/analytics/b9d_resolver.ts SMM --dry-run` then `--write`.

### Classification (transcript gate satisfied)

8 boundary payload tags classified across every SMM boundary, both directions.
Verdicts: **4 ORPHAN, 0 ROLL-UP, 0 MIS-TAG, 0 RESOLVED.** No destructive proposals
(no re-points, no mis-tag deletions, no legacy migration). The four ORPHANs (finding
grain = per (process, owner); owner = domain that masters the carried entity):

| process | pid | owner | owner built? | payload(s) | handoffs |
|---|---|---|---|---|---|
| 3.3.6 Analyze and respond to customer insight | 138 | CRM | unbuilt | customers | 89 SMM->CDP, 512 SMM->CRM |
| 3.3.4.5 Execute promotional activities | 665 | MA | built | marketing_campaigns | 91 SMM->MA, 90 SMM->MA |
| 3.3.6.1 Monitor and respond to social media activity | 674 | SMM | unbuilt | social_messages, social_mentions | 86/87/511 SMM->CSM |
| 3.5.1.2 Identify/receive leads/opportunities | 708 | CRM | unbuilt | crm_leads | 88 SMM->CRM |

### Owner-side edits applied (additive only; no catalog/DB writes; record_status untouched)

The resolver wrote durable `b2` items + plain-language q-file questions into each
OWNER domain's audit files (state.yaml hygiene carve-out (b)):

- **CRM** state.yaml + q-CRM.md: B2-B9D-OWN-138 (q9), B2-B9D-OWN-708 (q11).
- **MA** state.yaml + q-MA.md: B2-B9D-OWN-665 (q8).
- **SMM** state.yaml + q-SMM.md: B2-B9D-OWN-674 (q6) -- the one ORPHAN SMM owns
  (it masters social_messages/social_mentions on the inbound CSM->SMM boundary).

All four lands as `b2` (a user decision on who owns the unrealized work), never `b1b`.
SMM now carries B2-B9D-OWN-674 as an open b2; the other three are the neighbors' calls.

### state.yaml hygiene this pass

- **B1A-B9D-VERIFY**: RESOLVED (executed). Removed from `b1a`; b1a is now empty.
- **B2-NOTES-SKILLTOOLS (B2-S2)**: SUPERSEDED, removed from `b2`. It asked whether to
  carry legacy skill 18's `skill_tools` notes forward to per-module system skills. Live
  state confirms skill 18 is deleted, the per-module skills 358-361 are retired, and
  `skill_tools` is dropped entirely (per-domain-skill restoration, 2026-06-06); a single
  domain-grain `smm-system` (id 426, domain_module_id=null) now exists. The question has
  no live referent. The q-SMM.md regenerated this pass already omits it.

### Resulting status

`status: feedback_needed`, `next_action_by: user`. No agent-executable work remains:
b1a empty; every b1b item is blocked on a user_decision (B2-PATTERN-FLAGS, B1-S10-NAMING,
B2-REGULATION-SET) or depends_on chain; b2 items (B2-NOTES-DDO, B2-PATTERN-FLAGS,
B2-PARENT-DOMAIN, B2-REGULATION-SET, B2-B9D-OWN-674) all need user judgment; b3 are
deferred Phase-0 research. q-SMM.md is current (q1-q4 + q6 blocking, q5 optional).
