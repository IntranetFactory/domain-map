---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 22
---

# HCMS, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 `domain_modules` rows** (M1 hard-fail). 6 masters + 1 contributor authored via legacy `domain_data_objects` only (`content_types`, `content_entries`, `content_releases`, `editorial_workflows`, `content_locales`, `content_environments` as masters; `digital_assets` as contributor). 14 trigger_events. 12 outbound cross-domain handoffs (to DXP, B2C-COMM, MA, DAM, LSD, WEB-CONTOPS) + 3 inbound (from DAM, WEB-CONTOPS). 0 intra-domain handoffs (consistent with 0 modules). 12 aliases across 6 masters. 0 lifecycle states. 29 data_object relationships (12 intra-HCMS + cross-domain refs to `digital_assets`, `web_pages`, `customer_journeys`, `personalization_audiences`, `cdn_cache_invalidations`, `broken_link_findings`, `brand_voice_violations`, `glossary_terms`). 8 capabilities (HCMS-MODEL, HCMS-DELIVERY, HCMS-AUTHORING, HCMS-I18N, HCMS-DAM, HCMS-VERSIONING, HCMS-WEBHOOKS, HCMS-VISUAL). 11 solutions (10 primary + 1 partial). 0 regulations. 1 orphaned `skills` row (`hcms-system`, `skill_type='system'`, `domain_module_id=null`) with 6 `skill_tools` rows (all query primitives, all `requirement_level='required'`). 0 `role_modules`.
- **Vendor-surface basis (Pass 2 flagship enumeration):** Contentful, Sanity, Storyblok, Strapi, Hygraph, Kontent.ai, Contentstack, Prismic, ButterCMS, Payload CMS already loaded as `primary` solutions; Sitecore XM Cloud as `partial`. Flagship vendors not yet loaded: Builder.io (visual + composable), Directus (open-source self-hosted), Sitecore Content Hub ONE (per-orchestrator brief). Compliance anchor for HCMS is light: GDPR for personal-data fields, accessibility (WCAG 2.x) at the delivery layer, eIDAS not relevant. Zero `domain_regulations` rows.
- **Bucket 1 (in-scope, agent fixable):** 8 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 10 items.

**Neighbor discovery** (auto-derived from handoffs + DMDO refs + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| DXP | 6 | 0 | 0 (DXP refs HCMS masters but DXP has 0 modules) | 1 (`content_entries` re_renders / triggers_build_of / embargoes / purges / invalidates_cache_of `cdn_cache_invalidations` 441) | 7 | Pairwise (full) |
| DAM | 1 | 1 | 1 (HCMS `digital_assets` contributor) | 2 (`content_entries` references / resolves_assets_from `digital_assets`; `digital_assets` publishes_to `content_entries`) | 4 | Pairwise (full) |
| WEB-CONTOPS | 1 | 2 | 0 | 4 (`content_entries` feeds `web_pages` 116, refreshes `customer_journeys` 385; `content_locales` expands_scope_of `glossary_terms` 684; `content_entries` receives `brand_voice_violations` 689 / `broken_link_findings` 687) | 6 | Pairwise (full) |
| B2C-COMM | 2 | 0 | 0 | 0 (handoffs only) | 2 | Lightweight |
| MA | 1 | 0 | 0 | 0 | 1 | Lightweight |
| LSD | 1 | 0 | 0 | 1 (editorial_workflows → contracts 634, weak signal) | 1 | Lightweight |

**Structural pass bands:** **M1 hard-fails** (zero `domain_modules` rows on a domain with 8 capabilities and 6 masters). Rule #14 requires ≥1 full module always, and ≥2 full modules when capability count ≥3. Every downstream M / B / C / D / E / F band that depends on a `domain_modules` row is unauditable until S1 is loaded. **B9 partial-fail** (9 of 14 trigger_events carry empty `event_category`: 886-894). **B9b unauditable** (intra-domain cross-module handoffs cannot exist with 0 modules; this re-evaluates after S1). **F2 hard-fail** (the single `hcms-system` skill 67 has `domain_module_id=NULL`; Rule #17 requires exactly one `system` skill per `domain_modules` row; the orphan must be reparented or split when modules land). **F3 conditional-pass** (skill 67 has 6 `skill_tools` rows, all `query_<entity>` for the 6 masters, all `requirement_level='required'`, all `record_status='new'`). **F5 uncomputable** (Semantius score requires module assignment for the skill; pending S1+S3). **H1 hard-fail** (0 of 15 cross-domain handoffs carry `handoff_processes` rows; expected 0.5N to 0.8N agent_curated tags, i.e. 8-12 tags). **B10b** every cross-domain handoff carries NULL on both `source_domain_module_id` and `target_domain_module_id` because both endpoints have 0 modules: cascading M1 in the content cluster (DXP, DAM, WEB-CONTOPS, B2C-COMM, MA, LSD all show 0 modules at audit time). C1, C2, D1, E1-E6 unauditable until M1 closes. **Rule #15 clean** (`data_objects.notes`, `data_object_aliases.notes`, `skill_tools.notes` all empty across the 6 masters, 12 aliases, 6 skill_tools). **Rule #18 clean** (no vendor names in `domains.description` / `business_logic` for HCMS row 93). A / S bands pass on the strict checks they can run (the domain row itself populates all 7 mandatory metadata fields per Rule #8: `crud_percentage=90`, `business_logic` populated, `min_org_size='10 xs <50'`, `cost_band='$$'`, `certification_required=false`, `usa_market_size_usd_m=1200`, `market_size_source_year=2025`).

HCMS Semantius score: **uncomputable** until the orphan `hcms-system` skill (67) is reparented to a `domain_modules` row. F5 reads 0/N for now.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail), zero modules on a domain with 8 capabilities and 6 masters** | HCMS has no `domain_modules` rows. Rule #14 requires ≥1 full module always, and ≥2 full modules when capability count ≥3. The capability landscape (HCMS-MODEL, HCMS-DELIVERY, HCMS-AUTHORING, HCMS-I18N, HCMS-DAM, HCMS-VERSIONING, HCMS-WEBHOOKS, HCMS-VISUAL) suggests a 3-module split: (a) `HCMS-MODELING` (masters `content_types`, `content_environments`; capabilities HCMS-MODEL + HCMS-VERSIONING), (b) `HCMS-AUTHORING` (masters `content_entries`, `editorial_workflows`, `content_locales`; capabilities HCMS-AUTHORING + HCMS-I18N + HCMS-DAM + HCMS-VISUAL), (c) `HCMS-DELIVERY` (master `content_releases`; capabilities HCMS-DELIVERY + HCMS-WEBHOOKS). Each module gets the standard Rule #14 scaffold (three permissions, three roles, six FK columns), the matching `system` skill per Rule #17, and the realizing-module-prefixed workflow-gate permissions per Rule #12 once lifecycle states land. Surfaces design choice as B2-S4 (module split granularity is a deployability decision the user owns). | Author 3 `domain_modules` rows (or whatever count + names the user picks in B2-S4), migrate the existing `domain_data_objects` entries to per-module `domain_module_data_objects` (master rows on the module the audit assigns the master to; embedded_master rows on the sibling modules that need standalone deployability per Rule #11 invariant); attach skill 67 to the canonical module per B1-S3; insert role + permission + role_module scaffolding. Loader work, multi-file. |
| B1-S2 | **B9 (partial fail), missing `event_category`** | 9 of 14 trigger_events carry empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 886 `content_entry.created`, 887 `content_entry.scheduled`, 888 `content_entry.unpublished`, 889 `content_entry.translated`, 890 `content_release.failed`, 891 `editorial_workflow.review_required`, 892 `content_locale.added`, 893 `content_environment.promoted`, 894 `content_type.deprecated`. | PATCH: 886 → `lifecycle`, 887 → `lifecycle`, 888 → `state_change`, 889 → `state_change`, 890 → `state_change`, 891 → `signal`, 892 → `lifecycle`, 893 → `state_change`, 894 → `state_change`. Surgical CLI PATCHes (9). |
| B1-S3 | **F2 hard-fail, orphan system skill** | `skills.id=67` (`hcms-system`, `skill_type='system'`) has `domain_module_id=NULL`. Rule #17 requires the system skill belong to exactly one `domain_modules` row. Gated on B1-S1: when modules land, either (a) attach 67 to the canonical authoring module (single-system-skill HCMS), or (b) split 67 into one system skill per module (one per module per Rule #17). The current `skill_tools` footprint (6 query primitives, one per master) aligns with option (a) for a single authoring-centric module, but if the user picks a 3-module split in B2-S4, the skill must be split into 3 system skills (and the 6 tools repartitioned accordingly). | Gated on B2-S4 + B1-S1. Either PATCH `skills.id=67` set `domain_module_id=<new id>`, or DELETE skill 67 + INSERT N new `skills` rows + repartition the 6 `skill_tools` rows under them. |
| B1-S4 | **F3/F5 conditional, tool coverage and Semantius score** | The 6 `skill_tools` rows on skill 67 are all `query_<entity>` primitives at `requirement_level='required'`. Module deployability needs mutate primitives too (`create_content_entry`, `publish_content_entry`, `schedule_content_entry`, `create_content_release`, `add_locale`, `promote_environment`, `deprecate_content_type`, `request_review`). Tools to add: 8 mutates per the lifecycle transitions implied by the existing events. `operation_kind='mutate'` requires `data_object_id` populated per Rule #17. The Semantius score (F5) re-computes after the mutates land. Gated on B1-S1 (the tools need a module to attach to via the system skill). | Gated on B1-S1 + B1-S3. INSERT 8 `tools` rows + 8 `skill_tools` rows. The exact set re-evaluates once the module split is decided. |
| B1-S5 | **B10b report-only (outbound NULLs owed by target domains)** | All 12 outbound handoffs (92, 93, 94, 95, 96, 97, 803, 804, 805, 806, 807, 837) carry NULL `target_domain_module_id`. Owed work is split across 6 target domains: DXP (6 handoffs: 92, 95, 97, 803, 804, 805), B2C-COMM (2: 93, 96), MA (1: 94), DAM (1: 806), LSD (1: 807), WEB-CONTOPS (1: 837). HCMS's own `source_domain_module_id` is also NULL on every row, but that's blocked on B1-S1, not B10b. | Schedule b1 audits on DXP, B2C-COMM, MA, DAM, LSD, WEB-CONTOPS to populate `target_domain_module_id` on the 12 outbound handoffs once each target loads its own modules. Each of those domains independently fails M1 today, so the schedule is sequential: target's M1 fix unblocks its B10b. |
| B1-S6 | **B10b report-only (inbound NULLs owed by source domains)** | All 3 inbound handoffs (98 from DAM, 816 + 817 from WEB-CONTOPS) carry NULL `source_domain_module_id`. Owed work: DAM (1: 98) and WEB-CONTOPS (2: 816, 817). HCMS's own `target_domain_module_id` is also NULL on every row, blocked on B1-S1. | Schedule b1 audits on DAM and WEB-CONTOPS to populate `source_domain_module_id` on those 3 inbound handoffs after each loads its own modules. Same sequential dependency as B1-S5. |
| B1-S7 | **Pairwise, missing handoffs implied by relationship graph** | The relationship graph carries cross-domain edges that have no matching `handoffs` row: (a) `content_entries` (132) `re_renders` / `embargoes` / `purges` `cdn_cache_invalidations` (441) and `triggers_build_of` / `invalidates_cache_of` from `content_releases` (133) → these imply at least 1 HCMS → DXP delivery handoff on a publish event with `cdn_cache_invalidations` payload; the existing 12 outbound include no such row (the closest is 92 with payload `content_entries`, not the invalidation); (b) `content_entries` `feeds` `web_pages` (116) and `refreshes` `customer_journeys` (385) → WEB-CONTOPS already gets 837 on `content_locale.added` with `content_locales` payload, but no handoff on `content_entry.published` with `web_pages` payload; (c) `content_locales` `expands_scope_of` `glossary_terms` (684) → no handoff carries `glossary_terms` payload to WEB-CONTOPS; (d) `content_entries` `receives` `brand_voice_violations` (689) and `broken_link_findings` (687) → already covered by inbound 816, 817; (e) `editorial_workflows` `opens` `contracts` (634) → 807 covers via `editorial_workflow.review_required`. **Candidate inserts (3):** HCMS → DXP on `content_release.failed` (890) with `content_releases` payload; HCMS → DXP on `content_entry.unpublished` (888) with `cdn_cache_invalidations` payload (audit-side judgment, may instead be a DXP-derived event); HCMS → WEB-CONTOPS on `content_entry.published` (33) with `web_pages` payload. Gated on B1-S1 (source module FK has to point somewhere). | Gated on B1-S1. Author 3 new `handoffs` rows once modules exist. |
| B1-H1 | **H1 hard-fail, APQC tagging** | 0 of 15 cross-domain handoffs carry `handoff_processes` rows. Per SKILL H1 the audit produces 0.5N to 0.8N `agent_curated` tags for N cross-domain handoffs: target 8 to 12 tags. The audit produces 13 candidate proposals below; 2 deferred for no-PCF-match. | INSERT 13 `handoff_processes` rows with `proposal_source='agent_curated'`, `record_status='new'`, `role='implements'`. PCF id lookup at fix time. |

#### APQC TAGGING (B1-H1)

15 cross-domain handoffs total. Proposed `agent_curated` tags from the analyst's structural-pass model (PCF activity classifications based on the handoff source / target / event / payload context). PCF `external_id` lookups deferred to fix-time substring search against `apqc_pcf_cross_industry`.

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | confidence |
|---|---|---|---|---|---|
| 92 | HCMS → DXP | `content_entry.published` | `content_entries` | Develop and manage web content (10.5.x family) | confident L3 |
| 93 | HCMS → B2C-COMM | `content_entry.published` | `content_entries` | Manage product information / Develop and manage marketing content | confident L3 |
| 94 | HCMS → MA | `content_entry.published` | `content_entries` | Develop and manage promotional calendar / Manage campaigns | confident L3 |
| 95 | HCMS → DXP | `content_release.scheduled` | `content_releases` | Develop and manage web content / Schedule content publication | confident L3 |
| 96 | HCMS → B2C-COMM | `content_release.published` | `content_releases` | Develop and manage marketing content / Launch campaigns | confident L3 |
| 97 | HCMS → DXP | `content_type.changed` | `content_types` | Manage information assets / Define data architecture | medium |
| 803 | HCMS → DXP | `content_release.published` | `content_releases` | Develop and manage web content (10.5.x family) | confident L3 |
| 804 | HCMS → DXP | `content_entry.scheduled` | `content_entries` | Schedule content publication / Manage editorial calendar | confident L3 |
| 805 | HCMS → DXP | `content_entry.unpublished` | `content_entries` | Manage content lifecycle / Retire content | medium |
| 806 | HCMS → DAM | `content_entry.created` | `content_entries` | Manage digital assets / Catalog and tag assets | confident L3 |
| 807 | HCMS → LSD | `editorial_workflow.review_required` | `editorial_workflows` | Manage legal and ethical issues (11013 family) / Provide legal counsel | confident L3 |
| 837 | HCMS → WEB-CONTOPS | `content_locale.added` | `content_locales` | Manage translation and localization (16444 family or web content) | medium |
| 98 | DAM → HCMS | `digital_asset.published` | `digital_assets` | Manage digital assets / Distribute assets to content channels | confident L3 |

**Deferred to Discover Pass 3 (no clean PCF match):**

| handoff_id | source → target | reason |
|---|---|---|
| 816 | WEB-CONTOPS → HCMS (`brand_violation.detected`, `brand_voice_violations`) | Modern brand-governance workflow has no clean PCF cross-industry parent; closest is "Manage brand governance" which doesn't exist in PCF cross-industry. Custom-process candidate. |
| 817 | WEB-CONTOPS → HCMS (`broken_link.detected`, `broken_link_findings`) | Web-content QA workflow no clean PCF match; custom-process candidate. |

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 (entity gaps surface in Bucket 3 pending Phase 0) |
| WRONG-OWNERSHIP | 0 (no DMDO rows exist to mis-assign yet, gated on B1-S1) |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M1 + B9 + F2 + F3 + B10b x 2 + Pairwise handoffs) | 7 |
| BOUNDARY | 0 net new (all 15 cross-domain handoffs have boundary NULLs; covered under B10b S5/S6) |
| APQC TAGGING (B1-H1) | 1 item (13 candidate tags + 2 deferred) |
| MODULARIZATION ISSUES | 0 in Bucket 1 (the choice between 1 module vs 3 module split routes to B2-S4) |
| **Bucket 1 total** | **8 items** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Rule #12 lifecycle states, author or invoke config-shape exemption?** Zero rows in `data_object_lifecycle_states` for any of the 6 HCMS masters. Per Rule #12 every `master + required` data_object needs lifecycle states unless the config-shape exemption applies (author-once / occasionally-edit). Headless CMS masters split: `content_entries` and `content_releases` clearly carry workflow (draft → in_review → approved → scheduled → published → unpublished → archived), so the exemption does NOT apply; `content_types`, `content_environments`, `content_locales` are config-shape (author-once); `editorial_workflows` is the workflow-definition itself (config-shape). Surface for user approval before authoring. | Pattern-flag re-evaluation is a workflow-shape judgment the user owns. Rule #12 + Rule #15 prevent silent auto-population. | (a) Author lifecycle states for `content_entries` and `content_releases`; invoke config-shape exemption for the other 4 (surface to user during this audit, no `data_objects.notes` annotation per Rule #15). (b) Author lifecycle states for ALL 6. (c) Defer until B1-S1 lands (modules realize the states, the realizing module needs to exist first). |
| B2-S2 | **Pattern flag positive re-evaluation per Rule #12.** All 6 masters carry every pattern flag as `false`. Audit re-evaluation: (a) `content_entries.has_submit_lock` likely `true` (entries are immutable once published; editing requires unpublish or version); (b) `content_releases.has_submit_lock` likely `true` (a published release is a snapshot, immutable); (c) `editorial_workflows.has_single_approver` likely `false` (workflows are config; the per-entry review may have single or multi); (d) `content_entries.has_personal_content` worth considering `true` if entries can carry personally-identifiable form data, comments, author bylines (vendor surface: Contentful + Storyblok personalization sometimes brings audience attributes into entry payload). | Pattern flags are workflow-shape and content-shape judgments the user owns; the audit re-evaluates and proposes, the user decides per flag. | Per-flag yes/no from user. Capture in Decisions. |
| B2-S3 | **Single `system` skill vs per-module split (Rule #17).** The orphan `hcms-system` skill (67) at the head of B1-S3 carries 6 query primitives, one per master. Rule #17 requires exactly one system skill per module. Question: does HCMS deploy as 1 module (skill 67 attaches as-is with mutates added per B1-S4) or as 3 modules (3 system skills, the 6 tools repartition: MODELING gets `query_content_types` / `query_content_environments`; AUTHORING gets `query_content_entries` / `query_editorial_workflows` / `query_content_locales`; DELIVERY gets `query_content_releases`)? | Depends on the module-split decision in B2-S4. Gating order matters. | (a) Single-module HCMS, attach skill 67 to it. (b) 3-module split, split skill 67 into 3 system skills. (c) Other count, specify. |
| B2-S4 | **Module split granularity (modular intent for B1-S1).** With 8 capabilities and 6 masters, Rule #14 requires ≥2 full modules. Audit-suggested splits: (a) **3-module** (MODELING / AUTHORING / DELIVERY) as above; (b) **2-module** (HCMS-PLATFORM combining MODELING + AUTHORING; HCMS-DELIVERY); (c) **4-module** (split AUTHORING into HCMS-AUTHORING and HCMS-LOCALIZATION since I18N is a meaningful sub-surface and L10n vendors like Smartling / Lokalise integrate there); (d) **1-module** flagged for the Rule #14 violation override (only if user explicitly waives, not recommended). Each option drives the module set for B1-S1, which in turn drives the skill-split in B2-S3 / B1-S3 and the tool addition in B1-S4. The choice also affects which masters are `embedded_master` vs `master` on sibling modules (Rule #11 + Rule #16) once Rule #14 invariants apply. | Architectural intent / deployability question only the user can decide. | (a) 3-module split as proposed. (b) 2-module split. (c) 4-module split (separate HCMS-LOCALIZATION). (d) Other (specify). |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 enumeration ran against Contentful, Sanity, Storyblok, Strapi, Hygraph, Kontent.ai, Contentstack, Prismic, ButterCMS, Payload CMS (all loaded) + Sitecore XM Cloud (partial); flagship vendors not yet in catalog: Builder.io, Directus, Sitecore Content Hub ONE. None of those three change the entity surface in ways the loaded 11 don't already cover (Builder.io's visual editing maps to HCMS-VISUAL capability + a `visual_editor_pages` entity candidate; Directus is open-source self-hosted but offers nothing structurally distinct; Sitecore Content Hub ONE is the renamed Sitecore SaaS headless, already represented by Sitecore XM Cloud partial coverage).

Compliance anchors for HCMS are light: GDPR for personal-data fields inside entries, accessibility (WCAG 2.x) at the delivery / preview layer. No `domain_regulations` rows are loaded; this is fine for a low-compliance market but worth surfacing.

The subagent recipe was not spawned (single-pass audit per orchestrator instruction); the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for formal Phase 0 verification, not a vetted finding.

#### MISSING entity candidates (10) from flagship-vendor knowledge

| ID | Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|---|
| B3-E1 | `content_revisions` | Contentful Versions, Storyblok Story versions, Sanity history, Kontent.ai Versions all carry first-class revision rows distinct from `content_entries`. Currently no revision entity, version history is implicit. | HCMS-AUTHORING (or HCMS-VERSIONING-as-own-module) |
| B3-E2 | `content_components` (reusable blocks / global fields) | Storyblok Blocks, Contentstack Global Fields, Hygraph Components, Sanity Portable Text components, Builder.io Symbols all expose reusable sub-entry content as a first-class entity. Distinct from `content_types` (a `content_type` references many `content_components`). | HCMS-MODELING (master) |
| B3-E3 | `webhook_subscriptions` + `webhook_deliveries` | Capability HCMS-WEBHOOKS exists but no entity; all flagships expose webhook subscriptions + per-event delivery logs as administrable records. | HCMS-DELIVERY (masters) |
| B3-E4 | `api_tokens` / `delivery_keys` / `management_tokens` | Contentful API keys, Sanity tokens, Storyblok access tokens are first-class; API-first means token management is platform-level, not implicit. | HCMS-DELIVERY (master) |
| B3-E5 | `preview_environments` / `preview_tokens` | Visual editing (HCMS-VISUAL) needs preview URLs / signed preview tokens. Currently no entity, `content_environments` only covers production environments. | HCMS-AUTHORING (master) |
| B3-E6 | `translation_jobs` / `translation_tasks` | HCMS-I18N capability exists; Contentstack Smartling, Contentful Crowdin, Storyblok Lokalise integrations make translation jobs first-class workflow records. | HCMS-AUTHORING (master) or new HCMS-LOCALIZATION |
| B3-E7 | `taxonomies` / `content_tags` | Contentstack Taxonomy, Sanity references, Contentful Tags, Hygraph references all model taxonomy as a first-class entity distinct from `content_types`. | HCMS-MODELING (master) |
| B3-E8 | `audit_log_entries` (HCMS-scoped) | Contentstack Audit Logs, Contentful Activity Log, Sanity History all expose audit logs as queryable entities. May fold into platform-wide audit. | HCMS-DELIVERY (master) or platform |
| B3-E9 | `space_memberships` / `content_roles` | Multi-tenant access control on a space / project (Contentful Spaces, Sanity Projects, Storyblok Spaces) is first-class. May fold into platform `users` + `roles` with a junction. | HCMS-DELIVERY (master) or junction to platform users |
| B3-E10 | `personalization_audiences` / `personalization_rules` | Contentstack Personalize, Contentful Studio Personalization, Storyblok Personalization. May warrant its own market (DIGITAL-PERSONALIZATION candidate-domain, queued in `_missing-domains.md`). | new module or new domain |

#### MODULARIZATION candidates (2)

- **HCMS-LOCALIZATION as its own module** (B2-S4 option c). If translation_jobs (B3-E6) lands and TMS vendors (Smartling / Lokalise / Phrase) become integration anchors, the locale + translation workflow is a clean module split candidate. Would push HCMS to 4 full modules.
- **HCMS-VISUAL as its own module.** Builder.io / Storyblok visual editor / Contentful Studio are first-class visual-editing surfaces. If `preview_environments` (B3-E5) + `visual_editor_pages` land as masters, this could be a fifth module instead of folding into AUTHORING.

#### Compliance regulation candidates (no entity proposed, regulation rows missing)

- **GDPR** (mandatory for EU data subjects; entries can carry personal data via author bylines, comments, contact-form-style entry types).
- **WCAG 2.x accessibility** (mandatory in delivery / preview layer per WCAG 2.1 AA baseline for EU EAA 2025 and US ADA Title III public-sector).

#### Candidate domains queued via helper (none promoted, all pending review)

- **TMS, Translation Management System.** Queued in `audits/_missing-domains.md` (Smartling, Lokalise, Phrase, Crowdin, memoQ, Transifex). Adjacency to HCMS via `translation_jobs` workflow.
- **DIGITAL-PERSONALIZATION, Digital Personalization.** Queued in `audits/_missing-domains.md` (Ninetailed, Uniform, Optimizely Personalization, Dynamic Yield, Adobe Target, Mutiny). Adjacency to HCMS via personalization-audience / variant authoring inside content entries.

**Bucket 3 verification path:** Vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/HCMS-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 10 entity candidates + 2 modularization candidates + 2 regulation candidates + 2 queued domains to treat as confirmed and we proceed via Phase B / Phase A inserts).

### Cross-bucket dependencies

- **B1-S1 (M1 hard fail) is the master gate.** B1-S3 (F2 skill reparent), B1-S4 (tool additions), B1-S7 (3 missing handoffs), B2-S1 (lifecycle states), B2-S2 (pattern flags need a workflow shape to evaluate against), B2-S3 (skill split), B3-E1 / B3-E2 / B3-E3 / B3-E4 / B3-E5 / B3-E6 / B3-E7 / B3-E8 / B3-E9 / B3-E10 (every entity gap needs a module to land into) all depend on B1-S1.
- **B2-S4 (module split granularity) is the prerequisite for B1-S1.** The user picks the module count + names; B1-S1 then loads them.
- **B2-S3 (skill split) depends on B2-S4** (3 modules implies 3 system skills per Rule #17).
- **B1-S2 (event_category PATCH on 9 trigger_events) is independent** of every other bucket. Can apply immediately.
- **B1-S5 + B1-S6 (B10b report-only) depend on the target / source domains' own M1 fixes.** Sequential: each neighbor (DXP, B2C-COMM, MA, DAM, LSD, WEB-CONTOPS) must close its M1 before HCMS's outbound / inbound NULLs resolve. All 6 neighbors fail M1 today.
- **B1-H1 (APQC tagging) is independent** of B1-S1 (handoffs already exist with NULL module FKs; tagging the activity at PCF level doesn't need module assignment). Can apply immediately.
- **B3 candidate domains (TMS, DIGITAL-PERSONALIZATION) are independent** of HCMS's structural fixes; their promotion path runs through `audits/_missing-domains.md` triage.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or a list (e.g. `S2, H1`), or `skip`.

- **S1 (M1 hard fail, author the modules)** depends on B2-S4 module-split decision.
- **S2 (event_category PATCH on 9 events)** independent and trivial; surgical CLI.
- **S3 (F2 skill reparent or split)** depends on S1 + B2-S3.
- **S4 (add ~8 mutate tools)** depends on S1 + S3.
- **S5 + S6 (B10b report-only)** schedules 6 + 2 = 6 neighbor-domain audit waves; not HCMS's fix.
- **S7 (3 candidate handoffs from relationship graph)** depends on S1.
- **H1 (APQC tagging, 13 candidate tags + 2 deferred)** independent; load now or batch later?

**Bucket 2, what's your call on each?** I will wait for per-item decisions before acting.

- **B2-S1 (lifecycle states authoring):** (a) entries + releases only, (b) all 6, (c) defer.
- **B2-S2 (pattern flags):** per-flag yes/no on `has_submit_lock` (entries / releases), `has_personal_content` (entries), `has_single_approver` (editorial_workflows).
- **B2-S3 (skill split count):** (a) 1, (b) 3, (c) other (specify).
- **B2-S4 (module split count and names):** (a) 3 modules MODELING / AUTHORING / DELIVERY, (b) 2 modules PLATFORM / DELIVERY, (c) 4 modules MODELING / AUTHORING / LOCALIZATION / DELIVERY, (d) other (specify).

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 10 entity candidates + 2 modularization candidates + 2 regulation candidates to treat as confirmed. The 2 queued candidate domains (TMS, DIGITAL-PERSONALIZATION) follow the `audits/_missing-domains.md` triage path independently.

### Report-only follow-ups (owed by other domains)

These items surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain.

| Owing domain | Owed work |
|---|---|
| DXP | M1: 0 modules loaded today (cluster-wide M1 fail). B10b: populate `target_domain_module_id` on inbound handoffs 92, 95, 97, 803, 804, 805 once DXP's own modules land. Add `consumer` DMDO on `content_entries` (132) and `content_releases` (133) and `content_types` (131) on the receiving DXP module(s). |
| B2C-COMM | M1: 0 modules loaded today. B10b: populate `target_domain_module_id` on 93, 96. Add `consumer` DMDO on `content_entries` and `content_releases`. |
| MA | M1: 0 modules loaded today. B10b: populate `target_domain_module_id` on 94. Add `consumer` DMDO on `content_entries`. |
| DAM | M1: 0 modules loaded today. B10b: populate `target_domain_module_id` on 806 (HCMS → DAM `content_entry.created`) AND `source_domain_module_id` on 98 (DAM → HCMS `digital_asset.published`). Add `consumer` DMDO on `content_entries` if DAM subscribes. |
| LSD | M1: 0 modules loaded today. B10b: populate `target_domain_module_id` on 807. Add `consumer` DMDO on `editorial_workflows` if LSD subscribes. |
| WEB-CONTOPS | M1: 0 modules loaded today. B10b: populate `target_domain_module_id` on 837 (HCMS → WEB-CONTOPS `content_locale.added`) AND `source_domain_module_id` on 816, 817 (WEB-CONTOPS → HCMS `brand_violation.detected` / `broken_link.detected`). Add `consumer` DMDO on `content_locales`. Pairwise also surfaces missing handoff candidate: WEB-CONTOPS likely needs a `web_pages` payload handoff from HCMS on `content_entry.published` (per relationship 613 `content_entries feeds web_pages`); confirm at fix time. |

## 2026-05-31, Continuation: B1 technical fixes

Subagent continuation pass: apply only truly-technical B1 fixes the orchestrator pre-specified; defer everything that requires judgment, a module to exist, or another domain's M1 to close. Total B1 items in the 2026-05-30 audit: 8 (S1, S2, S3, S4, S5, S6, S7, H1).

### Fixes applied

| ID | Action | Result | UI |
|---|---|---|---|
| B1-S2 | PATCH `trigger_events.event_category` on 9 HCMS rows (886–894) per the audit's pre-specified state+verb table. Loader pre-flighted each row (confirmed `event_category=''` live before overwrite, enum-validated the proposed value against `lifecycle / state_change / threshold / signal`), PATCHed, and re-read; zero rows still empty after. | 9 PATCHes applied: 886 `content_entry.created`→`lifecycle`, 887 `content_entry.scheduled`→`lifecycle`, 888 `content_entry.unpublished`→`state_change`, 889 `content_entry.translated`→`state_change`, 890 `content_release.failed`→`state_change`, 891 `editorial_workflow.review_required`→`signal`, 892 `content_locale.added`→`lifecycle`, 893 `content_environment.promoted`→`state_change`, 894 `content_type.deprecated`→`state_change`. B9 closes for HCMS. | https://tests.semantius.app/domain_map/trigger_events |

### Deferred

| ID | Why deferred |
|---|---|
| B1-S1 | New `domain_modules` rows are gated on B2-S4 (module-split granularity is a user judgment call: 1 / 2 / 3 / 4 modules with naming). Orchestrator forbids new modules without pre-specified shape. |
| B1-S3 | Skill 67 reparent / split depends on B1-S1 and B2-S3 (single vs per-module skill count). No module exists yet to attach to. |
| B1-S4 | ~8 mutate `tools` + `skill_tools` additions depend on B1-S1 + B1-S3 (tools attach via the system skill which needs a module). |
| B1-S5 | B10b report-only: 12 outbound handoffs (92, 93, 94, 95, 96, 97, 803, 804, 805, 806, 807, 837) carry NULL `target_domain_module_id` because 6 neighbor domains (DXP, B2C-COMM, MA, DAM, LSD, WEB-CONTOPS) each fail M1. Owed by neighbors after their own b1 audits. |
| B1-S6 | B10b report-only: 3 inbound handoffs (98, 816, 817) carry NULL `source_domain_module_id` because DAM and WEB-CONTOPS fail M1. Owed by neighbors. |
| B1-S7 | 3 candidate handoffs (HCMS→DXP on `content_release.failed`; HCMS→DXP on `content_entry.unpublished` with `cdn_cache_invalidations`; HCMS→WEB-CONTOPS on `content_entry.published` with `web_pages`) gated on B1-S1 (source `domain_module_id` FK has nowhere to point). |
| B1-H1 | APQC `handoff_processes` tagging: audit explicitly defers PCF id lookup to fix-time substring search ("PCF id lookup at fix time", "PCF external_id lookups deferred to fix-time substring search"). Live PCF rows under `source_framework='apqc_pcf_cross_industry'` carry the content branch at 13.6.x ("Manage Content" 83 / "Develop and manage content" 428 / "Deliver approved content" 429), not the audit's speculative "10.5.x family". Choosing among 13.6.5 (`Develop and manage content`), 13.6.6 (`Deliver approved content`), 13.6.7 (`Control delivered content`), 13.6.5.13 / .14 / .15, 13.6.1.x for content strategy, etc., per handoff requires judgment the orchestrator did not pre-specify. Surface for user pick or schedule a dedicated APQC tagging pass. |

### Loader

[.tmp_deploy/fix_hcms_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_hcms_b1_technical_2026_05_31.ts) (run from project root `c:/dev/domain-map`).

