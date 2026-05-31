---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 22
---

# DXP - Audit History

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules` rows** (M1 hard fail, cascades through M-band and F-band); 7 masters (`web_pages`, `content_components`, `digital_experiences`, `personalization_rules`, `ab_tests`, `segments_dxp`, `journey_steps`) all loaded only in the legacy `domain_data_objects` rollup; 6 capabilities (`DXP-WCM`, `DXP-PERSONALIZE`, `DXP-PORTAL`, `DXP-AB-TEST`, `DXP-MULTISITE`, `DXP-FORM-JOURNEY`); 12 solutions (9 primary, 3 secondary); 10 `trigger_events` on the 7 masters (all 10 with empty `event_category`); 8 outbound + 11 inbound cross-domain handoffs (19 total); 0 intra-domain handoffs; 0 lifecycle states; 0 aliases; 0 `users` edges; 6 intra-domain `data_object_relationships` (all of them point inbound from HCMS, not between DXP masters); 1 legacy domain-level system skill `dxp-system` with 7 query tools (zero mutate, zero workflow gates) and `domain_module_id=null`; 0 roles. 2 regulations linked (ADA, Section 508).
- **Vendor-surface basis:** flagship vendors enumerated below.
- **Bucket 1 (in-scope, agent fixable):** 11 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| HCMS | 0 | 6 | 0 | 6 (HCMS->DXP only) | 6 | Pairwise (full) |
| PROD-MGMT | 1 | 3 | 1 (PM-DISCOVERY consumer of `ab_tests`) | 0 | 5 | Pairwise (full) |
| WEB-CONTOPS | 2 | 2 | 0 | 0 | 4 | Pairwise (full) |
| MA | 2 | 0 | 0 | 0 | 2 | Lightweight |
| CDP | 2 | 0 | 0 | 0 | 2 | Lightweight |
| B2C-COMM | 1 | 0 | 0 | 0 | 1 | Lightweight |

The dominant finding across every neighbor pass: **DXP has zero modules**, so every cross-domain edge has a NULL `source_domain_module_id` (or `target_domain_module_id` when DXP is the receiver) by structural necessity. Pairwise reconciliation cannot legitimately diff Section 2 (NULL module FKs) or Section 3 (missing handoffs from a module split) until B1-S1 is cured. The neighbor section below records what each neighbor relationship currently looks like; the deep diff defers to a re-audit after modules ship.

Structural pass bands: A1 / A2 / A3 / C1 / D1 pass; **M1 / M2 / M4 / M5 / M6 hard-fail** (zero modules); **B6 / B7 / B11 / B12 hard-fail** (zero intra-domain relationships between masters, zero `users` edges, zero aliases, zero lifecycle states); **B4 hard-fail** (all seven masters have all three pattern flags false-by-default, no positive re-evaluation recorded); **B8 hard-fail** (zero outbound cross-domain relationship rows mirroring the 8 outbound handoffs); **B9 partial-fail** (10 events exist but `event_category` is empty on every row); **B9b vacuously passes** (zero intra-domain handoffs but also zero modules to host them); **B10b hard-fail** (every outbound handoff has NULL `source_domain_module_id`, cascade of M1); **F1 / F2 / F3 hard-fail** (one legacy domain-level system skill with seven `query` tools, no module-anchored skill, no mutate or workflow-gate tools); **H1 hard-fail** (0 of 19 cross-domain handoffs carry any `handoff_processes` row); **E1 / E2 / E3 / E4 / E5** vacuously pass (single-module-equivalent shape because there are zero modules; no roles authored).

Semantius score is **uncomputable** for DXP because F2 fails (no module-anchored system skill). The legacy `dxp-system` skill scores `strict=7/7=100%` and `operational=7/7=100%` against its own 7 `skill_tools` rows, but per the Semantius score definition this score is module-anchored and the catalog rule prefers module-level skills over the legacy domain-level skill.

### Vendor surface basis

Flagship vendors enumerated for the market audit pass:

- **Adobe Experience Manager Sites** - full-stack WCM + AEM Sites + AEM Assets DAM + AEM Forms + Adobe Target personalization. Anchors the multi-site, page-template, and forms surface.
- **Sitecore XM Cloud** - composable WCM with built-in Sitecore Personalize and Sitecore Search. Anchors the headless-DXP shape and component/template authoring.
- **Optimizely DXP** - combines Optimizely CMS, Optimizely Web Experimentation, and Optimizely Personalization. Anchors the experimentation + variant surface.
- **Acquia DXP** (Drupal Cloud + Acquia Personalization + Acquia Optimize) - anchors open-source-based DXP and SEO/accessibility tooling.
- **Liferay DXP** - anchors the B2B portal substrate (authenticated portal pages, role-scoped portlets, partner / customer / employee portals).
- **Salesforce Experience Cloud** - anchors the CRM-grounded customer portal market (B2B Community, partner portal, help center).
- **Bloomreach Content** - anchors the commerce-coupled DXP shape and segment-driven personalization.

Compliance-specialist anchors: **Acquia Optimize** (accessibility / ADA / Section 508) and **Siteimprove** (accessibility + SEO). These surface accessibility findings as a cross-domain handoff back from WEB-CONTOPS; DXP itself does not master the findings.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 / M2 / M4 / M5 / M6 (hard fail)** | **Zero `domain_modules` rows** for DXP (`/domain_modules?domain_id=eq.77` returns `[]`). 6 capabilities are linked via `capability_domains` (DXP-WCM, DXP-PERSONALIZE, DXP-PORTAL, DXP-AB-TEST, DXP-MULTISITE, DXP-FORM-JOURNEY), so the >= 3 -> >= 2 modules rule under M2 applies. Every other M / F / B-band failure is a downstream cascade of this one: no module to attribute lifecycle states to (M5), no module to realize capabilities (M4 / M6), no module to anchor a system skill (F2), no module to populate `source_domain_module_id` on the 8 outbound handoffs (B10b), no module to write DMDO rows against (M7 catalog-wide passes by accident - only the legacy `domain_data_objects` rollup carries the master rows). | Propose a 2-to-4 module split before any other fix loads. Recommended starting shape (open to B2-1 decision): **`DXP-AUTHORING`** (web_pages, content_components - DXP-WCM + DXP-MULTISITE capabilities), **`DXP-PERSONALIZATION-EXPERIMENTATION`** (personalization_rules, ab_tests, segments_dxp - DXP-PERSONALIZE + DXP-AB-TEST), **`DXP-PORTAL`** (capability DXP-PORTAL; portal masters from Bucket 3), **`DXP-FORMS-JOURNEYS`** (journey_steps, forms from Bucket 3 - DXP-FORM-JOURNEY). All four are `module_kind='full'`. Each gets the required `domain_module_capabilities` rows plus a `domain_module_data_objects` row per master at `role='master', necessity='required'`. `digital_experiences` (campaign-tied surface) is a cross-module joiner - recommend `embedded_master` on every authoring module and `master` on `DXP-AUTHORING`. |
| B1-S2 | **B12 (hard fail)** | **Zero `data_object_lifecycle_states` for all 7 masters.** Every master has an obvious workflow ladder (web_pages: draft -> in_review -> approved -> published -> unpublished -> archived; ab_tests: configured -> running -> completed -> archived; personalization_rules: draft -> active -> paused -> retired; journey_steps: defined -> entered -> exited -> abandoned; digital_experiences: planned -> active -> ended; content_components: draft -> published -> deprecated; segments_dxp: draft -> published -> retired). Without lifecycle states no workflow-gate permissions are derivable. Per Rule #12 every `master + required` data_object needs lifecycle states unless it is genuinely config-shape (none of the 7 qualifies - every one carries a real state machine in flagship vendor docs). | Author lifecycle state rows for the 7 masters; mark `requires_permission=true` on the transition states (`publish`, `unpublish`, `activate`, `retire`, `start`, `complete`); set `domain_module_id` to the realizing module from B1-S1. Load via a focused loader after B1-S1 lands. |
| B1-S3 | **B4 (hard fail)** | **Pattern flags false-by-default across all 7 masters.** No positive re-evaluation recorded. Specifically: should `web_pages.has_submit_lock=true` (a published page is immutable until re-drafted)? Should `ab_tests.has_submit_lock=true` (running tests are config-frozen)? Should `personalization_rules.has_single_approver=true` (target-segment rule activation is typically gated on a single approver)? Should `journey_steps.has_personal_content=true` (journey timing data often carries PII per ADA / privacy law)? | Per-flag PATCH from B2-2 answers. Do NOT auto-populate `data_objects.notes` to explain the flags (Rule #15). |
| B1-S4 | **B7 (hard fail)** | **Zero `users` edges** between any DXP master and the `users` built-in (id=748). Each of the 7 masters has user-typed actors (page author, page approver, experiment owner, journey author, personalization rule author, segment author, page reviewer); none are captured as `data_object_relationships` rows. The relationship graph rendered for DXP today shows zero human actors. | Author 7-to-12 user-edge `data_object_relationships` rows: `users authors web_pages`, `users approves web_pages`, `users owns ab_tests`, `users authors personalization_rules`, `users authors segments_dxp`, `users designs journey_steps`, `users authors digital_experiences`, `users authors content_components`. Each row carries the standard `relationship_verb` / `inverse_verb` / `relationship_type='many_to_many'` / `relationship_kind='reference'` / `is_required=false` / `owner_side='target'` shape per Rule #10. |
| B1-S5 | **B6 (hard fail)** | **Zero intra-domain `data_object_relationships` between DXP masters.** Query `/data_object_relationships?and=(data_object_id.in.(441,442,443,444,445,446,447),related_data_object_id.in.(441,442,443,444,445,446,447))` returns empty. Expected edges (every flagship vendor's schema carries these): `web_pages embeds content_components` (one-to-many); `digital_experiences spans web_pages` (one-to-many); `personalization_rules targets segments_dxp` (many-to-many); `ab_tests runs_on web_pages` (one-to-many); `ab_tests evaluates personalization_rules` (one-to-many); `journey_steps composes digital_experiences` (many-to-one); `journey_steps references web_pages` (many-to-many). | Author 6-to-8 intra-domain relationship rows after B1-S1 and B1-S2 land (so the rows can carry meaningful `is_required` against the lifecycle state shapes). |
| B1-S6 | **B11 (hard fail)** | **Zero `data_object_aliases` across all 7 masters.** Flagship vendors use clearly different terminology that the DXP architect-view today cannot render: `web_pages` -> Page (Adobe AEM Sites), Item (Sitecore), Node (Drupal); `content_components` -> Experience Fragment (AEM), Rendering (Sitecore), Block (Drupal); `digital_experiences` -> Campaign (Bloomreach), Experience (Salesforce); `personalization_rules` -> Activity (Adobe Target), Personalization Rule (Sitecore), Experience (Optimizely); `ab_tests` -> Experience (Optimizely Web Experimentation), Activity (Adobe Target), Experiment (Sitecore Personalize); `segments_dxp` -> Audience (Adobe Target, Optimizely), Profile (Sitecore); `journey_steps` -> Journey Step (Bloomreach), Stage (Salesforce Marketing Cloud Journeys). | Author 14-to-20 alias rows after B1-S1. |
| B1-S7 | **B9 (Rule #13 enum violation)** | **All 10 `trigger_events` for DXP masters have empty `event_category`** (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`). Event ids: 876 `web_page.published`, 877 `web_page.unpublished`, 878 `content_component.updated`, 879 `digital_experience.activated`, 880 `personalization_rule.activated`, 881 `ab_test.started`, 882 `ab_test.completed`, 883 `segment_dxp.published`, 884 `journey_step.entered`, 885 `journey_step.abandoned`. | PATCH each row: 876 / 877 / 879 / 880 / 881 / 882 / 883 -> `state_change`; 878 `content_component.updated` -> `state_change`; 884 `journey_step.entered` -> `signal` (visitor activity event, not a state change on the master); 885 `journey_step.abandoned` -> `signal`. |
| B1-S8 | **B9 (missing events)** | **Coverage gap on workflow-gate state transitions.** Once B1-S2 lands, lifecycle states like `web_page.archived`, `web_page.draft`, `ab_test.archived`, `personalization_rule.paused`, `personalization_rule.retired`, `segment_dxp.retired`, `digital_experience.ended` will be flagged `requires_permission=true` but have no matching `trigger_events` row. The pass test in B9 says every workflow-gate state needs a published verb event. | Insert 5-to-7 additional `trigger_events` rows after B1-S2 lands; each `event_category='state_change'`, `data_object_id` pointing at the publishing master. |
| B1-S9 | **B8 (hard fail)** | **Zero outbound cross-domain `data_object_relationships` rows from DXP masters.** Query `/data_object_relationships?and=(data_object_id.in.(441,442,443,444,445,446,447),related_data_object_id.not.in.(441,442,443,444,445,446,447))` returns empty. The 8 outbound handoffs imply 8 corresponding payload-target relationship rows: handoff 808 (`digital_experience.activated` -> MA, payload `digital_experiences`) -> relationship to an MA-mastered campaign; handoffs 809 / 810 (`segment_dxp.published`, `journey_step.entered` -> CDP) -> relationships to CDP-mastered `customer_profiles` or `audience_segments`; handoff 811 (`journey_step.abandoned` -> MA) -> relationship to an MA-mastered enrollment; handoff 812 (`personalization_rule.activated` -> B2C-COMM) -> relationship to a B2C-COMM merchandising surface; handoff 813 (`ab_test.completed` -> PROD-MGMT, payload `ab_tests`) -> relationship to a PROD-MGMT-mastered `product_features` or `experiment_results`; handoffs 814 / 838 (`web_page.published`, `web_page.unpublished` -> WEB-CONTOPS) -> relationship to WEB-CONTOPS-mastered `page_audits` or `web_lifecycle_plans`. Some target-side masters may not yet be loaded; defer those rows until target identification is confirmed. | Surface to user; load the 4-to-6 cross-domain relationship rows whose target-side masters are already in the catalog (CDP `audience_segments`, MA `marketing_campaigns`, WEB-CONTOPS `web_lifecycle_plans`); defer the rest as Bucket 2 or B8 follow-ups. |
| B1-S10 | **F1 / F2 / F3 (hard fail)** | **Legacy domain-level system skill only, no module-anchored skill.** `skills.id=52, skill_name='dxp-system', skill_type='system', domain_id=77, domain_module_id=NULL`. Carries 7 `skill_tools` rows, all `query_*` shape (`query_web_pages`, `query_content_components`, `query_experiences`, `query_personalization_rules`, `query_ab_tests`, `query_segments_dxp`, `query_journey_steps`), all `coverage_tier='platform'`. **Zero mutate tools, zero workflow-gate tools, zero side_effect / compute tools.** Per Rule #17 every module needs exactly one `skill_type='system'` skill with `domain_module_id` set and >= 1 `skill_tools` row; the legacy domain-level skill is the migration target, not the target state. The mutate / workflow-gate floor (Rule #17 sub-invariant on F3 - typically >= 3 required tools per system skill) is unmet. | After B1-S1 lands, author one system skill per new module with `skill_type='system'` and `domain_module_id` set. Authoring floor per module: 4-to-8 tools mixing `query`, `mutate` (e.g. `create_web_page`, `update_personalization_rule`, `publish_ab_test`), `side_effect` (e.g. `purge_cdn_cache`, `invalidate_render_cache`), and `inbound` (e.g. `receive_cdp_segment_update`). Once module-anchored skills ship, DELETE the legacy `dxp-system` row (F1). |
| B1-S11 | **H1 (hard fail)** | **0 of 19 cross-domain handoffs carry any `handoff_processes` row.** Volume expectation per SKILL.md: 0.5N to 0.8N -> 10 to 15 `agent_curated` tags. Authoring proposals: |

##### APQC TAGGING proposals (B1-S11 detail)

| handoff_id | source -> target | trigger_event | payload | Proposed PCF (process_name / external_id, hierarchy_level) | Confidence |
|---|---|---|---|---|---|
| 814 | DXP -> WEB-CONTOPS | `web_page.published` | `web_pages` | Manage web content (search by "Manage web content"; APQC PCF Cross-Industry has process group "Develop and deliver products / services" -> "Manage product / service portfolio") | needs PCF lookup at fix time |
| 838 | DXP -> WEB-CONTOPS | `web_page.unpublished` | `web_pages` | Same family as 814 (web content lifecycle) | needs PCF lookup at fix time |
| 808 | DXP -> MA | `digital_experience.activated` | `digital_experiences` | Develop and manage marketing plans / Execute marketing campaigns | confident L3 (after lookup) |
| 811 | DXP -> MA | `journey_step.abandoned` | `journey_steps` | Manage customer interactions and complaints / Manage customer recovery | confident L3 (after lookup) |
| 809 | DXP -> CDP | `segment_dxp.published` | `segments_dxp` | Manage customer information / Develop customer insight | confident L3 (after lookup) |
| 810 | DXP -> CDP | `journey_step.entered` | `journey_steps` | Manage customer interactions (journey enrollment) | confident L3 (after lookup) |
| 812 | DXP -> B2C-COMM | `personalization_rule.activated` | `personalization_rules` | Develop and manage marketing plans (personalization activation) | confident L3 (after lookup) |
| 813 | DXP -> PROD-MGMT | `ab_test.completed` | `ab_tests` | Develop products and services / Test product or service | confident L3 (after lookup) |
| 92 | HCMS -> DXP | `content_entry.published` | `content_entries` | Manage web content (content publishing) | needs PCF lookup |
| 95 | HCMS -> DXP | `content_release.scheduled` | `content_releases` | Manage web content (release scheduling) | needs PCF lookup |
| 97 | HCMS -> DXP | `content_type.changed` | `content_types` | Manage content model evolution -- candidate L4 leaf; possibly defer | possibly defer to Discover Pass 3 |
| 803 | HCMS -> DXP | `content_release.published` | `content_releases` | Manage web content (release publishing) | needs PCF lookup |
| 804 | HCMS -> DXP | `content_entry.scheduled` | `content_entries` | Manage web content (entry scheduling) | needs PCF lookup |
| 805 | HCMS -> DXP | `content_entry.unpublished` | `content_entries` | Manage web content (entry unpublishing) | needs PCF lookup |
| 815 | WEB-CONTOPS -> DXP | `accessibility_finding.detected` | `accessibility_scan_findings` | Manage IT compliance (accessibility) / Manage regulatory compliance | possibly defer (modern digital-compliance leaf) |
| 820 | WEB-CONTOPS -> DXP | `seo_finding.created` | `technical_seo_findings` | Manage digital marketing (SEO) -- likely no clean PCF match | defer to Discover Pass 3 |
| 1001 | PROD-MGMT -> DXP | `product_feature.released` | `product_features` | Manage product release plans (releases to marketing channels) | needs PCF lookup |
| 1009 | PROD-MGMT -> DXP | `product_release.shipped` | `product_releases` | Manage product release plans | needs PCF lookup |
| 1011 | PROD-MGMT -> DXP | `product_roadmap.published` | `product_roadmaps` | Develop business strategy / Communicate strategy | needs PCF lookup |

Bucket 1 finding-type rollup:

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M / B / F bands) | 10 |
| APQC TAGGING (single sub-section) | 1 |
| WRONG-OWNERSHIP | 0 (deferred to Bucket 3) |
| SCOPE-CREEP | 0 |
| BOUNDARY | 0 in Bucket 1 (all routed to report-only since DXP has no modules to anchor module-FKs) |
| MISSING | 0 in Bucket 1 (entity gaps routed to Bucket 3 pending Phase 0) |
| **Bucket 1 total** | **11** |

#### Boundary findings per neighbor

##### HCMS (weight 6, pairwise full)

- Section 1: 6 inbound HCMS->DXP handoffs (ids 92, 95, 97, 803, 804, 805) plus 6 existing `data_object_relationships` from HCMS masters to DXP `web_pages` (relationship ids 616-621) -- the substrate is wired; HCMS already declares the inbound direction. The 6 relationships, however, all describe HCMS->DXP flows (`re_renders`, `triggers_build_of`, `invalidates_cache_of`, `embargoes`, `purges`, `breaks`) and would normally be authored on HCMS's audit since the publisher is HCMS. They sit on `data_object_id IN (131, 132, 133)` (HCMS masters), which is the correct ownership side per B8's asymmetry rule.
- Section 2: every HCMS->DXP handoff has NULL `source_domain_module_id` AND NULL `target_domain_module_id`. The source-side NULL is HCMS's B10b; the target-side NULL is DXP's B10b but cannot be fixed until B1-S1 lands.
- Section 3: missing handoffs from DXP back to HCMS - does DXP signal cache-invalidation completion or page-built-from-release status back? Probably no - HCMS is the publisher and DXP is the renderer; no upstream signal is expected. No B3 finding.
- Section 4 / 5: cross-domain relationship coverage is good in the HCMS->DXP direction.

##### PROD-MGMT (weight 5, pairwise full)

- Section 1: 1 outbound (`ab_test.completed` -> PM-DISCOVERY, handoff 813) is fully wired on the target side (target_domain_module_id=130). 3 inbound from PROD-MGMT (1001 `product_feature.released`, 1009 `product_release.shipped`, 1011 `product_roadmap.published`) all have `source_domain_module_id=131` set but `target_domain_module_id=NULL` (DXP has no modules).
- Section 2: B10b NULL on the DXP-target side (4 rows) cannot be fixed without B1-S1. Surface as in-scope but blocked.
- Section 3: PM-DISCOVERY (130) already declares a `consumer + optional` DMDO on `ab_tests` (442), the only non-DXP module that consumes any DXP master. This is the right shape under the M7 "Pass with note" classification. No missing handoff.
- Section 4: no integrity gaps.
- Section 5: missing `data_object_relationships` row for `ab_tests informs product_features` or `ab_tests evaluates product_releases` - this is part of B1-S9 above.

##### WEB-CONTOPS (weight 4, pairwise full)

- Section 1: 2 outbound (`web_page.published` 814, `web_page.unpublished` 838) NULL on both module FKs; 2 inbound (`accessibility_finding.detected` 815, `seo_finding.created` 820) NULL on both module FKs. DXP-side cure depends on B1-S1; WEB-CONTOPS-side cure depends on WEB-CONTOPS's B10b.
- Section 3: missing handoff DXP -> WEB-CONTOPS on `web_page.draft_created` or `web_page.review_requested` to kick off pre-publish accessibility / SEO scans? Plausible but speculative - defer to Bucket 3.
- Section 4 / 5: no other integrity gaps. Cross-relationship coverage zero (B1-S9).

##### Lightweight neighbors (weight 1-2)

- **MA (2 outbound):** 808, 811. Both NULL on both module FKs. No DMDO on either side. Missing MA-side consumer DMDOs on `digital_experiences`, `journey_steps` -> report-only on MA's audit.
- **CDP (2 outbound):** 809, 810. Both NULL on both module FKs. No DMDO on either side. Missing CDP-side consumer DMDOs on `segments_dxp`, `journey_steps` -> report-only on CDP's audit.
- **B2C-COMM (1 outbound):** 812. NULL on both module FKs. Missing B2C-COMM-side consumer DMDO on `personalization_rules` -> report-only on B2C-COMM's audit.

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-1 | **Module split shape** -- the proposed 4-module split in B1-S1 is one of several defensible shapes. Alternatives: (a) the 4-module split as proposed; (b) a 2-module split (`DXP-AUTHORING` covering pages+components+templates+sites+digital_experiences and `DXP-AUDIENCE-OPS` covering personalization+segments+ab_tests+journey_steps) -- matches the AEM Sites / Sitecore XM Cloud "authoring vs experience" line; (c) a 3-module split aligned to the major flagship product lines (`DXP-WCM`, `DXP-PERSONALIZE-EXPERIMENT`, `DXP-PORTAL`) with forms / journeys absorbed into the relevant module; (d) defer until Phase 0 produces the formal vendor surface and the module set comes back from the subagent. | Module split is a design call the user owns. The market-audit pass produced enough information to draft a defensible split, but committing to one before Phase 0 ratifies the surface risks a re-do. | (a) / (b) / (c) / (d) - user picks. |
| B2-2 | **Pattern flag positive re-evaluation** (B4): which of the following should flip to `true`? Each affects derived permissions and the workflow-gate surface: `web_pages.has_submit_lock` (published pages immutable until re-drafted), `ab_tests.has_submit_lock` (running tests config-frozen), `personalization_rules.has_single_approver` (activation approval is a single sign-off), `journey_steps.has_personal_content` (timing data + visitor identifiers under ADA / privacy law), `digital_experiences.has_submit_lock` (campaign-tied surface frozen on activation), `segments_dxp.has_submit_lock` (published segment definitions immutable until re-drafted), `content_components.has_submit_lock` (published components immutable until re-drafted). | Pattern-flag judgments are workflow-shape decisions the user owns; the false-by-default doesn't establish review. | Per-flag yes / no from user. |
| B2-3 | **Vendor-name scan on DXP description text** (Rule #18 check). DXP's `domains.description`, `business_logic`, and `notes` columns currently read clean of vendor names (description: "Web content management, personalisation, customer portals, and headless content delivery for branded digital experiences."; business_logic: "Personalisation and recommendation engines, A/B testing infrastructure, and search ranking; the content-management side is CRUD."; notes empty). British spelling on "personalisation" is acceptable per Rule #18 since it's not a vendor name, but per CLAUDE.md's American-English-only rule the spelling should be `personalization`. Question: PATCH `description` and `business_logic` to switch `personalisation` -> `personalization` (plus capitalise sentence-starters)? | American-English rule is in CLAUDE.md, but this is editorial polish on a domain row that A1 already passes. | (a) PATCH to American-English spelling, (b) leave (low-priority polish, gets fixed in the next domain-row refresh). |
| B2-4 | **`segments_dxp` naming arbitration** (Rule #9 collision pattern). The bare `segments` name is presumably claimed by CDP (the canonical audience-segments market); DXP carries `segments_dxp` to avoid collision. Per Rule #9 the suffix is acceptable, but per Rule #18 a forward-looking question: when DIGITAL-PERSONALIZATION (queued in `_missing-domains.md`) is promoted, the canonical segment master may move there. Recommendation: leave `segments_dxp` as-is; the DIGITAL-PERSONALIZATION promotion path will decide whether `segments_dxp` is a `consumer` or `embedded_master` of that future domain's `segments` master. | Future-domain promotion timing is the user's call. | (a) leave as-is, (b) rename `segments_dxp` -> `personalization_segments` to disambiguate from CDP and a future DIGITAL-PERSONALIZATION market, (c) wait until DIGITAL-PERSONALIZATION promotes. |

### Bucket 3 - Phase 0 pending (speculative)

The market-audit semantic pass (using the analyst's own flagship-vendor knowledge - no separate subagent invocation per the mass-audit constraint) identifies the following candidates against the union surface of AEM Sites, Sitecore XM Cloud, Optimizely DXP, Acquia, Liferay, Salesforce Experience Cloud, and Bloomreach.

| ID | Finding | Type | Vendor knowledge basis | Recommended verification |
|---|---|---|---|---|
| B3-1 | **`site_definitions`** (Common) -- the multi-site / multi-brand master. Every flagship vendor distinguishes Site / Tenant / Property from Page. AEM Sites' "site" object, Sitecore's "tenant", Drupal's "site". Backs the DXP-MULTISITE capability which currently has no master backing. | MISSING | All 7 flagship vendors | Phase 0 vendor research: confirm field set (locale, brand, environment, base_url, cdn_config, theme); confirm relationship `site_definitions has_many web_pages`. |
| B3-2 | **`page_templates`, `layouts`, `content_blocks`** (Core) -- the authoring substrate. Every flagship vendor distinguishes between a page (instance) and a template (reusable structure). AEM "page template", Sitecore "Page Type / Rendering", Drupal "Layout Builder". Backs the DXP-WCM capability beyond the bare `web_pages` master. | MISSING | All 7 vendors | Phase 0 verification: pick `page_templates` vs `layouts` as the higher-level master; confirm `content_blocks` is distinct from `content_components` or merge. |
| B3-3 | **Experiment vs Variant split** -- the current `ab_tests` master collapses both. Optimizely Web Experimentation, Sitecore Personalize, and Adobe Target all model experiment (the test definition), variant (the served version), and result (the measured outcome) as separate masters with their own lifecycles. `experiment_variants` and `experiment_results` belong as separate masters. | MISSING (2 entities) | Optimizely, Adobe Target, Sitecore Personalize, AB Tasty | Phase 0 verification: confirm whether `ab_tests` should be renamed `experiments` plus add `experiment_variants` and `experiment_results`; matters because cross-domain relationships from PROD-MGMT reference the experiment result, not the experiment definition. |
| B3-4 | **`forms`, `form_fields`, `form_submissions`** -- the form-authoring substrate backing DXP-FORM-JOURNEY. AEM Forms, Sitecore Forms, Drupal Webform, Salesforce Experience Cloud Forms all carry these masters. `journey_steps` is the orchestration layer; forms are the data-capture layer. Without forms, DXP-FORM-JOURNEY has half its substrate missing. | MISSING (3 entities) | AEM Forms, Sitecore Forms, Drupal Webform | Phase 0 verification: confirm whether forms is a master in DXP or a consumer of a parent FORMS market (Typeform, Formstack, JotForm exist as standalone). |
| B3-5 | **`portal_pages`, `portal_widgets`, `portal_user_profiles`** -- the B2B portal substrate backing DXP-PORTAL. Liferay's portlets, Salesforce Experience Cloud's components, IBM HCL Digital Experience's portal pages all carry this distinct surface from public web pages. The portal authentication shape (logged-in users, role-scoped widgets, organization-scoped pages) is structurally different from public `web_pages`. PORTAL-FRAMEWORK has been queued as a separate candidate market (`audits/_missing-domains.md`). | MISSING (3-to-5 entities) -- may resolve via PORTAL-FRAMEWORK promotion | Liferay, Salesforce Experience Cloud, IBM HCL Digital Experience, Backbase | Phase 0 verification dependent on PORTAL-FRAMEWORK triage decision. If PORTAL-FRAMEWORK is promoted, DXP's DXP-PORTAL capability either disappears (portal moves out) or becomes a consumer of PORTAL-FRAMEWORK masters. If PORTAL-FRAMEWORK is folded into DXP, these masters land in `DXP-PORTAL` module. |
| B3-6 | **MODULARIZATION** -- the proposed 4-module split (B1-S1) needs Phase 0 ratification. If portals move to PORTAL-FRAMEWORK, the DXP-PORTAL module disappears. If forms move to a standalone FORMS market, DXP-FORMS-JOURNEYS collapses to journeys only. Net plausible end states: 2 modules (authoring + personalization-experimentation), 3 modules (add a portal or forms module), or 4 modules as initially proposed. | MODULARIZATION | The flagship vendor split (suite-aligned modules vs pure-play markets) | Phase 0 subagent pass per the standard procedure; output to `c:/tmp/DXP-phase0-2026-05-30.md` listing each entity's vendor surface and proposed module. |
| B3-7 | **WRONG-OWNERSHIP candidate** -- `segments_dxp` and `personalization_rules` may belong to a future DIGITAL-PERSONALIZATION domain (queued). The DXP catalog's `personalization_rules` master would either move out (if DIGITAL-PERSONALIZATION promotes and absorbs them as canonical masters) or remain (if DIGITAL-PERSONALIZATION is folded back into DXP as a sub-feature). | WRONG-OWNERSHIP (potential) | Adobe Target, Sitecore Personalize, Optimizely Personalization positioned as point solutions | Phase 0 + DIGITAL-PERSONALIZATION triage decision. |

### Cross-bucket dependencies

- **B1-S1 (modules) gates almost everything in Bucket 1.** B1-S2 (lifecycle states need `domain_module_id`), B1-S5 (intra-domain relationships need a stable cross-module diagram), B1-S8 (workflow-gate events depend on lifecycle states), B1-S10 (module-anchored system skills), B1-S11 partial (some PCF tags depend on which module is the publisher) all wait on B1-S1.
- **B1-S1 is itself shaped by B2-1 (which module split).** Recommend resolving B2-1 first; then load B1-S1; then queue B1-S2 / S4 / S5 / S6 / S8 / S10 / S11 as a single follow-up batch.
- **B1-S3 (pattern flags) depends on B2-2.** Independent of B2-1.
- **B1-S7 (event_category PATCHes) is independent.** Can land first as a quick win (10 PATCHes).
- **B1-S4 (users edges) is independent of B1-S1** structurally; can land alongside the event_category fixes. Once B1-S5 lands, the relationship graph becomes legible.
- **Bucket 3 informs B2-1 (the module split).** If B3-5 / B3-7 resolve toward promotion (portal and personalization spin out as separate domains), the DXP module set shrinks; if they fold back in, the module set grows. Recommend running formal Phase 0 before committing to B2-1.
- **B1-S11 APQC TAGGING can ship independently of every other Bucket 1 item.** PCF lookup is read-only against the catalog; the tag rows are pure inserts on `handoff_processes`.

### Per-bucket prompts

**Bucket 1 - fix these now?** Reply with: `all`, or list (e.g. `S7, S11`), or `skip`.

- **S1 (M-band hard fail - author 2-to-4 `domain_modules`, depends on B2-1):** decide B2-1 first.
- **S2 (B12 lifecycle states):** depends on S1.
- **S3 (B4 pattern flags):** independent; needs B2-2 answers.
- **S4 (B7 users edges, 7-to-12 rows):** independent of S1.
- **S5 (B6 intra-domain relationships):** depends on S1+S2.
- **S6 (B11 aliases, 14-to-20 rows):** depends on S1.
- **S7 (B9 event_category PATCH, 10 rows):** independent; quick win.
- **S8 (B9 missing workflow events):** depends on S2.
- **S9 (B8 outbound cross-domain relationships, 4-to-6 rows):** independent of S1.
- **S10 (F2 module-anchored system skill + mutate / workflow-gate tools):** depends on S1.
- **S11 (H1 APQC TAGGING, 10-to-15 high-confidence rows + 2-to-3 deferred):** independent; can ship immediately.

**Bucket 2 - what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-1 (module split):** (a) 4-module / (b) 2-module / (c) 3-module / (d) defer to Phase 0.
- **B2-2 (pattern flags):** per-flag yes / no for each of the 7 candidates.
- **B2-3 (American-English spelling on DXP description):** (a) PATCH now / (b) leave.
- **B2-4 (`segments_dxp` naming):** (a) leave / (b) rename to `personalization_segments` / (c) wait on DIGITAL-PERSONALIZATION promotion.

**Bucket 3 - Phase 0 pending - vet via formal Phase 0 vendor research or eyeball-mode?**

The strongest signals are the multi-site substrate (B3-1) and the page-template substrate (B3-2) - both are Core class across every flagship vendor and would land in `DXP-AUTHORING` regardless of which 2 / 3 / 4 module split lands. If you commit to part of the work, that's the highest-leverage cluster. Recommend running formal Phase 0 to ratify the full surface before committing to B2-1 module-split shape.

Candidates queued in `audits/_missing-domains.md` from this audit: **DIGITAL-PERSONALIZATION** (mention count bumped to 2), **FEATURE-FLAGGING** (mention count bumped to 2), **PORTAL-FRAMEWORK** (new candidate).

### Report-only follow-ups (owed by other domains)

| Owed by | Check | Detail |
|---|---|---|
| HCMS | B10b (`source_domain_module_id`) | 6 inbound HCMS->DXP handoffs (92, 95, 97, 803, 804, 805) have NULL `source_domain_module_id`. HCMS owes the fix. |
| WEB-CONTOPS | B10b (`source_domain_module_id`) | 2 inbound WEB-CONTOPS->DXP handoffs (815, 820) have NULL `source_domain_module_id`. WEB-CONTOPS owes the fix. |
| PROD-MGMT | B10b (`source_domain_module_id`) | 3 inbound PROD-MGMT->DXP handoffs (1001, 1009, 1011) have `source_domain_module_id=131` set, no fix owed on the source side. Only the target-side NULL is DXP's B10b - and that cannot be fixed until B1-S1 lands. |
| MA | B8 (consumer DMDO) + B10b | MA should declare consumer DMDOs on `digital_experiences` and `journey_steps` if any MA module reads those payloads; MA's audit also owes its `target_domain_module_id` on outbound DXP handoffs 808 / 811. |
| CDP | B8 (consumer DMDO) + B10b | CDP should declare consumer DMDOs on `segments_dxp` and `journey_steps`; CDP's audit also owes its `target_domain_module_id` on 809 / 810. |
| B2C-COMM | B8 (consumer DMDO) + B10b | B2C-COMM should declare a consumer DMDO on `personalization_rules`; B2C-COMM's audit also owes its `target_domain_module_id` on 812. |
| WEB-CONTOPS | B8 (consumer DMDO) + B10b | WEB-CONTOPS should declare consumer DMDOs on `web_pages` if any WCO module reads the payload; WCO's audit owes its `target_domain_module_id` on 814 / 838. |
| PROD-MGMT | B10b (`target_domain_module_id`) | PROD-MGMT-side cure already present (PM-DISCOVERY 130 declares `ab_tests` consumer DMDO) and target_domain_module_id=130 is set on handoff 813. No action. |

User decides whether to schedule b1 audits for HCMS, WEB-CONTOPS, MA, CDP, B2C-COMM, PROD-MGMT.

## 2026-05-31, Continuation: B1 technical fixes

Applied the deterministic subset of Bucket 1 that does not require user judgment.
Loader: [.tmp_deploy/fix_dxp_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_dxp_b1_technical_2026_05_31.ts).

### Applied

- **B1-S7 (B9 enum backfill, 10 PATCHes).** `trigger_events.event_category` populated on ids 876, 877, 878, 879, 880, 881, 882, 883 -> `state_change` and 884, 885 -> `signal`, per the audit's pre-specified mapping. All 10 rows now satisfy Rule #13.
- **B1-S4 (B7 users edges, 8 INSERTs).** Authored the 8 user-actor `data_object_relationships` rows the audit enumerated verbatim under Rule #10: `users authors web_pages` (id 1559), `users approves web_pages` (1560), `users owns ab_tests` (1561), `users authors personalization_rules` (1562), `users authors segments_dxp` (1563), `users designs journey_steps` (1564), `users authors digital_experiences` (1565), `users authors content_components` (1566). Shape per audit B1-S4: `relationship_type=many_to_many`, `relationship_kind=reference`, `is_required=false`, `owner_side=target`, `record_status=new`. `data_object_id=748` (users, `kind=platform_builtin`). `notes` left empty per Rule #15.

### Deferred

- **B1-S1 (M-band modules):** gated on B2-1 user decision (which module split).
- **B1-S2 (B12 lifecycle states):** depends on S1 (states need `domain_module_id`).
- **B1-S3 (B4 pattern flags):** gated on B2-2 user picks (per-flag yes / no).
- **B1-S5 (B6 intra-domain relationships):** depends on S1 + S2.
- **B1-S6 (B11 aliases):** depends on S1.
- **B1-S8 (B9 workflow events):** depends on S2.
- **B1-S9 (B8 outbound cross-domain relationships):** audit explicitly says "Surface to user"; target-side masters partially unloaded.
- **B1-S10 (F2 module-anchored system skill):** depends on S1.
- **B1-S11 (H1 APQC tagging):** every proposed PCF row in the audit table is flagged "needs PCF lookup at fix time", "confident L3 (after lookup)", or "possibly defer" / "defer to Discover Pass 3". No row pre-specifies a verified `handoff_id + resolvable PCF` tuple, so all 19 candidates are deferred per the technical-fix-only contract.

### Net effect on bands

- **B9 (Rule #13 enum):** partial-fail -> pass for the 10 existing events. Coverage gap on missing workflow-gate events (B1-S8) is unaffected.
- **B7 (users edges):** hard-fail -> pass (8 edges authored covering all 7 masters, with web_pages double-edged for author + approver).

All other Bucket 1 bands remain in their pre-continuation state. Bucket 2 / 3 unchanged.

UI:
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/data_object_relationships
