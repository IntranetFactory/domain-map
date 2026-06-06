# DAM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 1 master data_object (`digital_assets`, id 137), 0 `domain_modules`, 1 capability (`CREATIVE-REVIEW`), 1 solution link (Adobe Experience Manager, secondary), 0 regulations, 1 trigger_event, 1 outbound + 2 inbound cross-domain handoffs, 0 intra-domain handoffs, 0 lifecycle states, 3 aliases, 1 legacy domain-level system skill (`dam-system`, id 44) with 1 platform tool (`query_digital_assets`).
- Vendor-surface basis (flagship vendors enumerated): Bynder, Brandfolder (Smartsheet), Frontify, Adobe Experience Manager Assets, Cloudinary, Widen Collective (Acquia), MediaValet. Adobe AEM Assets is the catalog incumbent. Bynder, Brandfolder, Frontify are the brand-led pure-plays. Cloudinary anchors the dynamic-delivery / transformation specialist leg. Widen and MediaValet cover the mid-market.
- **Bucket 1 (in-scope, agent fixable):** 12 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.
- Candidates queued to `audits/_missing-domains.md`: 3 (CREATIVE-PROOFING bumped, MRM bumped, BRAND-PORTAL new).

Structural posture: M-band fails outright (zero `domain_modules`), which gates B / E / F. Phase A is shallow (1 capability, 1 solution, 0 regulations). Phase B has the headline master and aliases but no lifecycle states, no DMDOs, and the `users` edges run one-way. F-band fails on Rule #17 (system skill is domain-anchored, not module-anchored; one tool only).

### Vendor surface basis

Adobe Experience Manager Assets is the enterprise incumbent and the only catalog-loaded solution today. Bynder, Brandfolder (Smartsheet), and Frontify are the brand-led pure-plays that dominate the mid-to-upper market and ship the canonical DAM workflow (upload, taxonomy, rights, approval, share-link distribution, brand-portal). Cloudinary is the API-first dynamic-delivery and image-transformation specialist (every modern DAM ships some form of this primitive). Widen Collective (acquired by Acquia) and MediaValet round out the mid-market with PIM-adjacent and channel-distribution muscle. The audit treats these seven as the union surface for the MISSING / SCOPE-CREEP findings.

### Pass 3, Neighbor discovery

Cross-edges auto-discovered from `handoffs` (source or target = DAM, id 92):

| Neighbor | Outbound from DAM | Inbound to DAM | Edge weight | Deep dive? |
|---|---|---|---|---|
| HCMS (id 93) | 1 (`digital_asset.published`) | 1 (`content_entry.created`) | 2 | one-line summary |
| AGENCY-MGMT (id 153) | 0 | 1 (`deliverable.approved`) | 1 | one-line summary |

No neighbor exceeds weight 3, so no full 5-section pairwise diff is run; both are summarized in the per-neighbor section below.

### Bucket 1, In-scope confirmed gaps

#### MISSING (universal-vendor entities, non-regulatory)

| ID | Entity | Proposed module | Vendor evidence | Notes |
|---|---|---|---|---|
| B1-M1 | `asset_renditions` | DAM-ASSET-LIB | Bynder, Brandfolder, Frontify, Adobe AEM Assets, Cloudinary, Widen | Per-format derivative (thumbnails, web-res, print-res, video bitrates). Universal. |
| B1-M2 | `asset_versions` | DAM-ASSET-LIB | Bynder, Brandfolder, Frontify, AEM, Widen | Version history on a single asset (re-edits, revisions, supersedes). Distinct from `asset_renditions`. |
| B1-M3 | `asset_collections` | DAM-ASSET-LIB | Bynder (collections), Brandfolder (collections), Frontify (libraries), AEM, Widen | User-curated groupings, distinct from taxonomy categories. |
| B1-M4 | `asset_categories` | DAM-ASSET-LIB | All vendors | Hierarchical taxonomy / folder tree. |
| B1-M5 | `asset_rights` | DAM-ASSET-LIB | Bynder, Brandfolder, Frontify, AEM (rights), Widen | License terms, usage rights, territory, expiry. Drives downstream policy gates. |
| B1-M6 | `model_releases` | DAM-ASSET-LIB | Bynder, AEM, Widen (talent and property releases) | Signed release forms (talent, property, location) attached to an asset. |
| B1-M7 | `share_links` | DAM-DISTRIBUTION | All vendors | External-share URLs with expiry, watermark, password, view-count tracking. The dominant DAM distribution primitive. |
| B1-M8 | `asset_publications` | DAM-DISTRIBUTION | AEM (publishing), Bynder (channel publishing), Widen, Brandfolder | Outbound delivery to channels (web, social, partner CDN, PIM). The state-machine entity behind `digital_asset.published`. |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | M1 | DAM has zero `domain_modules` rows. Per Rule #14, every domain needs at least one full module. The legacy `domain_data_objects` master row on `digital_assets` (id 137) exists but no `domain_module_data_objects` row anywhere in DAM. The DAM domain is undeployable. | Phase M load: author at least 2 full modules (DAM-ASSET-LIB and DAM-DISTRIBUTION are the minimum split; a 3-module shape adds DAM-RIGHTS-MGMT or DAM-CREATIVE-REVIEW). Load `domain_modules` + `domain_module_capabilities` + `domain_module_data_objects` (master row on digital_assets, plus the embedded_master / consumer rows for `users`, `content_entries`, `creative_deliverables`). |
| B1-S2 | M2 | DAM has 1 capability today and gates M2 vacuously. After fixing A2 (add 4-6 capabilities), M2 binds and requires at least 2 full modules. | Solved by B1-S1 when M2 binds. |
| B1-S3 | M4 | The single capability `CREATIVE-REVIEW` (id 446) has no realizing module (no `domain_module_capabilities` row exists for any DAM module, because no modules exist). | Solved by B1-S1 (link CREATIVE-REVIEW to whichever module hosts review workflow, likely the DAM-DISTRIBUTION or a new DAM-CREATIVE-REVIEW module). |
| B1-S4 | A1 / Rule #20 | `catalog_tagline` and `catalog_description` are both empty strings. | Draft per Rule #20 buyer voice, surface to user for review BEFORE writing. |
| B1-S5 | A2 | Only 1 capability (`CREATIVE-REVIEW`) is linked. The pass threshold is at least 3 (typical 5-8). | Phase A capability load: author asset-library, asset-taxonomy, rights-mgmt, brand-portal, asset-distribution, dynamic-delivery-transformation (5-6 candidate capabilities). |
| B1-S6 | A3 | Only 1 solution (Adobe Experience Manager, secondary) is linked. Pass threshold is at least 3 solutions, with at least 1 `primary`. | Phase A solution load: add Bynder (primary), Brandfolder (primary), Frontify (primary or secondary), Cloudinary (secondary, transformation-specialist), Widen Collective (secondary). |
| B1-S7 | B7 | `digital_assets` (master) has zero outbound edges to `users` in `data_object_relationships`. Three inbound rows exist (`users uploaded digital_assets`, `users owns digital_assets`, `users approves digital_assets`) but no symmetric `digital_assets ... users` row, despite the master clearly having user-typed actors (uploader, owner, approver). Per Rule #10, edges should exist in both directions on `data_object_relationships`. | Author 3 outbound `digital_assets ... users` rows symmetric to the existing inbound rows. |
| B1-S8 | B12 | `digital_assets` has zero `data_object_lifecycle_states` rows despite being a workflow-bearing master (`digital_asset.published` trigger event exists, implying at least `draft / review / approved / published / archived` states). | Phase B load: author lifecycle states (initial: `uploaded` or `draft`; gated transitions: `submitted_for_review`, `approved`, `published`, `archived`; with `requires_permission=true` and `domain_module_id` set per M5). |
| B1-S9 | B4 | `digital_assets` pattern flags (`has_personal_content`, `has_submit_lock`, `has_single_approver`) all default to false. The audit must positively re-evaluate. `has_personal_content=true` is plausible (assets often contain personal images and require GDPR / model-release handling). `has_submit_lock=true` plausible on the approved->published transition. `has_single_approver` plausible on certain workflows. | Surface for explicit consideration; PATCH where the pattern matches. |
| B1-S10 | F1 / F2 | `dam-system` (skill id 44) is the legacy domain-level system skill (`domain_id=92`, `domain_module_id=null`). Per Rule #17 + F2, every `domain_modules` row needs a module-anchored system skill named `<module_code_lower>_agent`. The legacy row blocks F1 once modules exist. | Phase S load (sequenced after B1-S1): author one `system` skill per DAM module (e.g. `dam_asset_lib_agent`, `dam_distribution_agent`), populate skill_tools, then retire the legacy `dam-system` row (or migrate its single tool link). |
| B1-S11 | F3 | The legacy `dam-system` skill has only 1 `skill_tools` row (`query_digital_assets`, platform). The Phase-S floor is 3+ required tools and 5-20 total. | Solved by B1-S10's Phase S authoring against the new modules. |

#### APQC TAGGING

DAM has 3 cross-domain handoffs (1 outbound + 2 inbound). The `Manage Content` PCF cluster (L2 id 83) under "Define content systems of record and storage requirements" (L3 426) and "Deliver approved content" (L3 429) carries the relevant leaves. Existing tag count on these handoffs: 0.

Agent-curated proposals:

| handoff_id | source -> target | trigger_event | payload | Proposed PCF row | PCF id | external_id | confidence |
|---|---|---|---|---|---|---|---|
| B1-H1 (98) | DAM -> HCMS | digital_asset.published | digital_assets | Publish approved content | 1763 | 21681 | confident L4 |
| B1-H2 (344) | AGENCY-MGMT -> DAM | deliverable.approved | creative_deliverables | Assess and approve content | 1762 | 21680 | confident L4 |
| B1-H3 (806) | HCMS -> DAM | content_entry.created | content_entries | Develop and manage content | 428 | 21670 | confident L3 |

No deferred-to-Discover items: every DAM cross-domain handoff has a clean PCF L3 or L4 match.

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | Outbound handoff 98 (`digital_asset.published` DAM -> HCMS) has both `source_domain_module_id` and `target_domain_module_id` NULL. Source side is NULL because DAM has no modules (root cause: B1-S1). Target side is NULL because the partner-side fix is HCMS's responsibility (report-only). | Fix `source_domain_module_id` once DAM modules ship (set to the module mastering `digital_assets`, e.g. `DAM-ASSET-LIB` or `DAM-DISTRIBUTION` depending on the chosen split). Target side stays in the HCMS report-only follow-ups. |
| B1-B2 | Inbound handoff 344 (`deliverable.approved` AGENCY-MGMT -> DAM) has `target_domain_module_id` NULL. Source side is also NULL but that is AGENCY-MGMT's concern. | Fix `target_domain_module_id` once DAM modules ship (set to whichever DAM module consumes `creative_deliverables`, likely DAM-ASSET-LIB or DAM-CREATIVE-REVIEW). |
| B1-B3 | Inbound handoff 806 (`content_entry.created` HCMS -> DAM) has `target_domain_module_id` NULL. | Fix `target_domain_module_id` once DAM modules ship. |

### Bucket 2, Surface-for-user (judgment calls)

1. **Modularization choice (the load-bearing question).** The DAM market admits several module splits. Options:
   - **2-module split:** DAM-ASSET-LIB (masters `digital_assets`, `asset_renditions`, `asset_versions`, `asset_collections`, `asset_categories`, `asset_rights`, `model_releases`) + DAM-DISTRIBUTION (masters `share_links`, `asset_publications`). Clean, minimal, satisfies the M2 floor if A2 (B1-S5) ends up at 3+ capabilities.
   - **3-module split:** add DAM-CREATIVE-REVIEW (masters review-thread / approval-round entities; absorbs `creative_briefs` and `creative_deliverables` consumer links). Useful if Bucket 3 review-workflow entities (B3-1 below) are confirmed.
   - **4-module split:** add DAM-RIGHTS-MGMT as a standalone module (masters `asset_rights`, `model_releases`, `license_agreements`). Justified only if rights/licensing is the buyer-visible primary workflow (Bynder-like enterprise tier), not the storage layer.
   Decision unblocks B1-S1, B1-S3, B1-B1/B2/B3 patches and the B3 candidate routing.

2. **`pim_digital_assets` (id 816) versus `digital_assets` (id 137), single-master architecture.** PIM masters `pim_digital_assets` in module `PIM-DIGITAL-ASSETS` (module id 142, master + required), separate from DAM's `digital_assets`. Per the data_object descriptions, `pim_digital_assets` is "The DAM slice that lives inside PIM in v1; can be split out to a DAM domain when warranted." This is a deliberate seam, but the two entities mean the catalog has two parallel master surfaces for the same concept. Options: (a) keep parallel masters (current state, deliberate v1 seam, decide when to consolidate); (b) demote `pim_digital_assets` to `embedded_master` consuming the canonical DAM master; (c) merge the two data_objects (heavy refactor). Independent of Bucket 3.

3. **`creative_briefs` (483) and `creative_deliverables` (484), where do they sit?** Both are mastered elsewhere (AGENCY-MGMT, based on the `deliverable.approved` inbound). DAM consumes `creative_deliverables` per relationship row `creative_deliverables registers_as digital_assets`. Options: (a) declare DAM modules as `consumer` on both; (b) declare as `embedded_master` if DAM is plausibly deployed without AGENCY-MGMT for many customers (most are: brand-led DAMs ship without an agency tier). Decide once modularization (Bucket 2 item 1) is chosen.

4. **Regulations on DAM.** DAM domain has zero `domain_regulations` rows. Which apply?
   - **GDPR / CCPA**, for personal-content assets (model releases, employee photos). Strong default for any DAM deployment.
   - **Copyright / DMCA**, for third-party-licensed assets. Always in scope when rights are tracked.
   - **HIPAA**, only for healthcare-vertical DAMs (patient imagery, clinical photography).
   - **Trademark policy / FTC advertising guidelines**, situational.
   Decide which to load now versus defer to a later compliance audit.

5. **Capability cross-cutting candidates.** Several DAM candidate capabilities may cross domains:
   - `BRAND-MGMT` or `BRAND-GUIDELINES`, also relevant in MRM and AGENCY-MGMT (cross-cutting, per Rule #15 convention).
   - `DIGITAL-RIGHTS-MGMT`, also relevant in HCMS, PIM, B2C-COMM (cross-cutting).
   - `CREATIVE-REVIEW` (already domain-neutral) is correctly cross-cutting between DAM and AGENCY-MGMT and (with B3 candidate) potentially CREATIVE-PROOFING.
   Decide cross-cutting vs domain-prefixed at the time of A2 load.

6. **Roles for DAM (Brand and Creative function).** Brand and Creative business_function (id 55) has zero roles loaded today. After the M-band lands and DAM has at least 2 modules, the typical persona shape is:
   - `BRAND-CREATIVE-BRAND-MANAGER` (cross-module: DAM-ASSET-LIB + DAM-DISTRIBUTION + DAM-RIGHTS-MGMT if present)
   - `BRAND-CREATIVE-CREATIVE-OPS` (primary on DAM-ASSET-LIB, secondary on DAM-CREATIVE-REVIEW)
   - `BRAND-CREATIVE-PHOTOGRAPHER` or `CONTENT-CREATOR` (primary on DAM-ASSET-LIB, single-task uploader)
   Decide whether to author roles now or defer until after modules ship.

### Bucket 3, Phase 0 pending (speculative, vendor-research vetting needed)

| # | Candidate | Proposed module | Vendor evidence |
|---|---|---|---|
| B3-1 | `review_rounds` and `review_comments` (annotation / pinned-comment threads on a creative) | DAM-CREATIVE-REVIEW (if 3-module split) or DAM-DISTRIBUTION | Frontify, Bynder Studio, Adobe AEM Workfront-tie. Also the heart of the CREATIVE-PROOFING candidate domain (queued). |
| B3-2 | `brand_guidelines` (downloadable brand book entries: logo lockups, color tokens, typography specs) | DAM-DISTRIBUTION (brand-portal slice) or new DAM-BRAND-PORTAL module | Bynder, Frontify (brand guidelines is Frontify's flagship), Brandfolder. Could justify the BRAND-PORTAL candidate domain. |
| B3-3 | `asset_transformations` (image-on-the-fly resize, crop, format-convert, watermark) | DAM-DISTRIBUTION | Cloudinary (flagship), Imgix, Adobe AEM dynamic media. Could justify a separate domain (`DYNAMIC-MEDIA`) if Cloudinary-class transformation-only vendors are recognized as a market. |
| B3-4 | `asset_usage_events` (where an asset is embedded, when it was downloaded, by whom) | DAM-DISTRIBUTION (analytics slice) | Bynder, Brandfolder analytics, Adobe AEM Insights. Universal at the upper tier. |
| B3-5 | `upload_sessions` (bulk-upload session with progress, error handling) | DAM-ASSET-LIB | All flagship DAMs. Possibly modeled as state-machine on `digital_assets` rather than as a separate master. |
| B3-6 | `creative_workspaces` or `creative_projects` (project-level grouping of creative work, with deadlines, contributors) | DAM-CREATIVE-REVIEW | Adobe AEM Workfront, Frontify Workspaces, Brandfolder Workspaces. Overlap with MRM (Marketing Resource Management) candidate. |
| B3-7 | `license_agreements` (third-party stock-photo and music-licensing contracts attached to an asset) | DAM-RIGHTS-MGMT (if 4-module split) or DAM-ASSET-LIB | Bynder enterprise, AEM Assets, Widen. Overlaps with `asset_rights` (B1-M5). Decide whether one or two entities. |

### Cross-bucket dependencies

- **Bucket 2 item 1 (modularization choice) gates Bucket 1 items B1-S1 / B1-S3 / B1-B1 / B1-B2 / B1-B3 / B1-S10.** The module set must be chosen first; the structural fixes then materialize against the chosen split.
- **Bucket 2 item 3 (`creative_briefs` and `creative_deliverables` placement) depends on Bucket 2 item 1** (the chosen modularization decides which DAM module gets the consumer / embedded_master link).
- **Bucket 3 item B3-2 informs Bucket 2 item 5 (cross-cutting capability decisions)** (`brand_guidelines` is the BRAND-PORTAL anchor; if eyeball-confirmed, the cross-cutting BRAND-MGMT capability is more justified).
- **Bucket 3 items B3-1 and B3-6 inform Bucket 2 item 1** (a 3- or 4-module split is easier to justify if B3-1 review entities and B3-6 workspaces are vendor-confirmed).
- **Bucket 1 APQC tagging (B1-H1 / B1-H2 / B1-H3) is independent** of all Bucket 2 / Bucket 3 items, can be loaded immediately on user approval.

### Per-bucket prompts

- **After Bucket 1:** Fix these now? The modularization choice in Bucket 2 item 1 is the prerequisite for B1-S1 / B1-S3 / B1-B1 / B1-B2 / B1-B3 / B1-S10. The MISSING entities (B1-M1 through B1-M8) and the APQC tags (B1-H1 / B1-H2 / B1-H3) can ship independently once the module set is named. Reply with which items to schedule.
- **After Bucket 2:** What's your call on each of items 1 through 6? Item 1 is the load-bearing decision; please pick a 2-module, 3-module, or 4-module shape with module codes and short scope descriptions. For item 4 (regulations) and item 6 (roles), please name which to author now versus defer.
- **After Bucket 3:** Vet via Phase 0 research, or eyeball-mode? If eyeball, please name which candidates (B3-1 through B3-7) ring true so they can be promoted to Bucket 1 in the next load.

### Report-only follow-ups (owed by other domains)

| Owning domain | Owed work | Reason |
|---|---|---|
| HCMS (id 93) | B10b: handoff 98's `target_domain_module_id` is NULL on the HCMS side. HCMS owes the DMDO consumer row on `digital_assets` plus the per-module FK patch. | HCMS-side B10b backfill. |
| AGENCY-MGMT (id 153) | B10b: handoff 344's `source_domain_module_id` is NULL on the AGENCY-MGMT side. AGENCY-MGMT owes the per-module FK patch. | AGENCY-MGMT-side B10b backfill. |
| HCMS (id 93) | B10b: handoff 806's `source_domain_module_id` is NULL on the HCMS side. HCMS owes the per-module FK patch. | HCMS-side B10b backfill. |
| PIM (id 167) | Decision on the `pim_digital_assets` versus `digital_assets` seam (Bucket 2 item 2). PIM-side may need to demote `pim_digital_assets` to `embedded_master` of the DAM master once DAM modules ship. | PIM-side architectural decision tracked here for visibility. |

#### Per-neighbor one-line summaries

- **HCMS (weight 2).** Bidirectional edge: DAM publishes `digital_asset.published` to HCMS (handoff 98), HCMS publishes `content_entry.created` to DAM (handoff 806). Both directions carry NULL module FKs on both sides because DAM has no modules; B10b will resolve on each side after Phase M lands on both domains.
- **AGENCY-MGMT (weight 1).** Single inbound edge: `deliverable.approved` (handoff 344). Target-side NULL is DAM's responsibility once Phase M lands; source-side NULL is AGENCY-MGMT's.

### Candidates queued to `audits/_missing-domains.md`

- **CREATIVE-PROOFING** (bumped, mention_count 1 to 2): annotated-review specialist market (Ziflow, Filestage, GoVisually, Approval Studio, ProofHub, Aproove). Adjacency: DAM, AGENCY-MGMT, MRM, HCMS.
- **MRM** (bumped, mention_count 1 to 2): Marketing Resource Management (Aprimo, Workfront for Marketing, Hive9, Allocadia, Plannuh). Adjacency: DAM, AGENCY-MGMT, PMM, ADV-AD-TECH.
- **BRAND-PORTAL** (new candidate): Brand Portal and Brand Management (Frontify, Bynder Brand Guidelines, Brandfolder Brand Guidelines, Lingo, Brandworkz, Templafy). Adjacency: DAM, MRM, AGENCY-MGMT, HCMS.

## 2026-05-31, Continuation: B1 technical fixes

### Scope

Apply only truly-technical B1 fixes from the 2026-05-30 audit. Defer everything gated on the Bucket 2 item 1 modularization choice or that requires new entities / lifecycle states / modules / capabilities / solutions / catalog copy / pattern-flag judgment.

### Applied (3 of 12 B1 items)

| ID | Type | Action | Result |
|---|---|---|---|
| B1-H1 | APQC tag | INSERT `handoff_processes` (handoff 98 -> process 1763, "Publish approved content") | id 709, key `98.1763`, `proposal_source='agent_curated'`, `record_status='new'` |
| B1-H2 | APQC tag | INSERT `handoff_processes` (handoff 344 -> process 1762, "Assess and approve content"); existing (344, 141) untouched | id 710, key `344.1762`, `proposal_source='agent_curated'`, `record_status='new'` |
| B1-H3 | APQC tag | INSERT `handoff_processes` (handoff 806 -> process 428, "Develop and manage content") | id 711, key `806.428`, `proposal_source='agent_curated'`, `record_status='new'` |

Pre-flight confirmed all three pairs were absent before insert (the `key` unique-value constraint on `handoff_processes` would have rejected a duplicate anyway). All three rows omit `record_status` (DB default `new` per Rule #1), omit `notes` (default `''` per Rule #15), and omit `role` (default `implements`).

### Deferred (9 of 12 B1 items)

| ID(s) | Type | Defer reason |
|---|---|---|
| B1-M1 .. B1-M8 | New `data_objects` (8 rows) | Per brief: "new entities/DMDOs/modules" deferred; targeted modules (`DAM-ASSET-LIB`, `DAM-DISTRIBUTION`) are not yet decided. Gated on Bucket 2 item 1. |
| B1-S1 | New `domain_modules` rows | Bucket 2 item 1 (modularization choice: 2/3/4-module split) is a user decision per brief. |
| B1-S2, B1-S3 | Solved-by-S1 | Same gate as B1-S1. |
| B1-S4 | `catalog_tagline` / `catalog_description` | Per brief: Rule #20 buyer-voice copy is deferred (surface to user before writing). |
| B1-S5 | New `capabilities` + `capability_domains` | New entities; also implicates cross-cutting decisions in Bucket 2 item 5. |
| B1-S6 | New `solutions` + `solution_domains` | New entities; vendor surface needs user pick on `primary`/`secondary` split. |
| B1-S7 | Outbound `digital_assets ... users` edges | Audit asks for 3 rows "symmetric to the existing inbound" but does not pre-specify exact `relationship_verb` / `data_object_relationship_label` / `inverse_verb` / cardinality / `owner_side` tuples. Per brief, Rule #10 user-edges only applied when the audit pre-specifies the exact tuple. |
| B1-S8 | `data_object_lifecycle_states` for `digital_assets` | Lifecycle states need `domain_module_id` (M5), which depends on B1-S1 modules existing. |
| B1-S9 | Pattern flags on `digital_assets` (`has_personal_content`, `has_submit_lock`, `has_single_approver`) | Audit text: "surface for explicit consideration; PATCH where the pattern matches." Per brief: pattern flag flips are deferred (judgment). |
| B1-S10, B1-S11 | Retire legacy `dam-system` skill / author module-anchored system skills + `skill_tools` | New `skills` + `skill_tools` rows; gated on Bucket 2 item 1 modules. |
| B1-B1, B1-B2, B1-B3 | Handoff module-FK PATCHes (`source_domain_module_id` / `target_domain_module_id` on handoffs 98, 344, 806) | Audit explicitly says "fix once DAM modules ship": no DAM module exists today, so the FK has no resolvable target. Not derivable from existing modules per brief. |

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_dam_b1_technical_2026_05_31.ts`. Idempotent: pre-flight refuses to proceed if any of the three (handoff, process) keys already exist.

### UI link

https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

- Current footprint (live re-pull): 1 master data_object (`digital_assets`, id 137, `kind=domain_owned`), 0 `domain_modules`, 0 cross-cutting host junctions, 1 capability (`CREATIVE-REVIEW` id 446), 1 solution link (Adobe Experience Manager id 375, `secondary`), 0 regulations, 1 trigger_event (`digital_asset.published` id 46, `lifecycle`), 1 outbound + 2 inbound cross-domain handoffs (ids 98, 344, 806), 0 intra-domain handoffs, 0 lifecycle states, 3 aliases (`asset`, `creative asset`, `brand asset`), 7 `data_object_relationships` (3 user-edges inbound, 1 outbound to content_entries, 1 inbound from creative_deliverables, 2 inbound from content_entries), 1 legacy domain-level system skill (`dam-system` id 44, `domain_module_id=null`) with 1 `skill_tools` row (`query_digital_assets` id 380, kind `query`), 0 `domain_module_data_objects` rows for `digital_assets`, 4 `handoff_processes` rows (709/710/711 from prior continuation + pre-existing 344/141).
- Pattern flags on `digital_assets` (137): all three `false` (`has_personal_content`, `has_submit_lock`, `has_single_approver`).
- `domains.business_logic` on row 92 contains a U+2014 em-dash (between "watermark)" and "irreducible"); flagged for sanitization. `description` is clean.
- `catalog_tagline` and `catalog_description` both empty.
- Bucket 1 (in-scope, agent fixable): 14 items.
- Bucket 2 (surface-for-user, judgment): 6 items.
- Bucket 3 (Phase 0 pending, speculative): 7 items.

### Structural posture

The 2026-05-30 audit's classification holds with no measurable progress on the structural fronts:

- **M-band** still fails outright (M1: zero `domain_modules`). M2/M4 vacuously pass on 1 capability but bind to a real failure once A2 is fixed. The whole B/C/E/F stack is gated on M.
- **A-band**: A1 (Rule #20 copy) empty; A2 capability count at 1 (floor 3); A3 solutions at 1 (floor 3, no `primary`).
- **B-band**: B5 master shape OK; B7 user-edges asymmetric (3 inbound, 0 outbound); B9 events present (1, `lifecycle`); B9b NULL module FKs on both sides of all 3 cross-domain handoffs; B10b consequently fails; B11 aliases present (3); B12 lifecycle states absent on a workflow-bearing master.
- **C-band**: C1 (intra-domain handoffs) zero, acceptable for single-master domain; C2 cross-domain handoffs present but all carry NULL module FKs (B9b shadow).
- **D-band**: D1 trigger events tied to master OK; D2 NULL module FKs.
- **E-band**: E1 modules absent → E2/E3/E4/E5 all gated.
- **F-band**: F1 fails (legacy skill is domain-level, not module-level per Rule #17); F2 fails (zero `system` skills on a `domain_module` since no modules exist); F3 fails (legacy skill has 1 tool only, floor 3-5); F4 trivially passes on the single existing tool (`query` + `data_object_id`); F5 Semantius score uncomputable.
- **H-band**: 4 `handoff_processes` rows total, all at `record_status=new`; 3 at `proposal_source=agent_curated`. Catalog-quality headline: 0 `approved`.

### Bucket 1, In-scope confirmed gaps

Carrying forward from 2026-05-30 (all items still pending, classified to b1a vs b1b per blocker analysis):

#### MISSING (universal-vendor entities, non-regulatory) - all b1b, blocked on Bucket 2 item 1 modularization choice

| ID | Entity | Proposed module (range) | Vendor evidence |
|---|---|---|---|
| B1-M1 | `asset_renditions` | DAM-ASSET-LIB | Bynder, Brandfolder, Frontify, AEM, Cloudinary, Widen |
| B1-M2 | `asset_versions` | DAM-ASSET-LIB | Bynder, Brandfolder, Frontify, AEM, Widen |
| B1-M3 | `asset_collections` | DAM-ASSET-LIB | Bynder, Brandfolder, Frontify, AEM, Widen |
| B1-M4 | `asset_categories` | DAM-ASSET-LIB | All flagship DAMs |
| B1-M5 | `asset_rights` | DAM-ASSET-LIB or DAM-RIGHTS-MGMT | Bynder, Brandfolder, Frontify, AEM, Widen |
| B1-M6 | `model_releases` | DAM-ASSET-LIB or DAM-RIGHTS-MGMT | Bynder, AEM, Widen |
| B1-M7 | `share_links` | DAM-DISTRIBUTION | All flagship DAMs |
| B1-M8 | `asset_publications` | DAM-DISTRIBUTION | AEM, Bynder, Widen, Brandfolder |

#### STRUCTURAL band failures

| ID | Band | Status | Bucket |
|---|---|---|---|
| B1-S1 | M1 | 0 `domain_modules`; Rule #14 floor. | b1b, gated on B2-1 |
| B1-S2 | M2 | Solved by S1 once A2 lands. | b1b, gated on B2-1 + B1-S5 |
| B1-S3 | M4 | CREATIVE-REVIEW (446) has no realizing `domain_module_capabilities` row. | b1b, gated on B2-1 |
| B1-S4 | A1 / Rule #20 | `catalog_tagline` and `catalog_description` empty. | b2 (Rule #20 wording requires user approval) |
| B1-S5 | A2 | 1 capability; floor 3 (typical 5-8). | b2/b1b: capability list requires user pick; some intersect B2-5 cross-cutting decisions |
| B1-S6 | A3 | 1 solution (secondary); floor 3 with at least 1 `primary`. | b2/b1b: vendor primary/secondary split requires user pick |
| B1-S7 | B7 | 3 inbound user-edges, 0 outbound. Rule #10 symmetric edges. | b1b: audit does not pre-specify exact verb / inverse / owner_side tuples |
| B1-S8 | B12 | 0 lifecycle states on `digital_assets`; trigger event `digital_asset.published` exists. | b1b, gated on B1-S1 (M5 needs `domain_module_id`) |
| B1-S9 | B4 | Pattern flags all `false`; positive re-evaluation owed. | b2 (judgment per audit) |
| B1-S10 | F1 / F2 | Legacy `dam-system` skill is domain-level; needs module-anchored per Rule #17. | b1b, gated on B1-S1 |
| B1-S11 | F3 | Legacy skill has 1 tool; floor 3-5 required tools + 5-20 total. | b1b, gated on B1-S10 |
| B1-S12 (new) | A0 / em-dash policy | `domains.business_logic` on row 92 contains a U+2014 em-dash. `description` is clean. The em-dash policy bans U+2014 everywhere in catalog text. | b1a: PATCH `business_logic` (replace U+2014 with comma) |
| B1-S13 (new) | H-band catalog quality | 4 `handoff_processes` rows total, 0 at `approved`. Catalog-quality headline owed. | b2: requires user review of the 4 rows to flip `record_status` (Rule #1) |

#### BOUNDARY

| ID | Finding | Bucket |
|---|---|---|
| B1-B1 | Handoff 98 (`digital_asset.published` DAM → HCMS): `source_domain_module_id` NULL (DAM-side fix); `target_domain_module_id` NULL (HCMS-side, report-only). | b1b on DAM side, gated on B1-S1 |
| B1-B2 | Handoff 344 (`deliverable.approved` AGENCY-MGMT → DAM): `target_domain_module_id` NULL. | b1b, gated on B1-S1 |
| B1-B3 | Handoff 806 (`content_entry.created` HCMS → DAM): `target_domain_module_id` NULL. | b1b, gated on B1-S1 |

### Bucket 2, Surface-for-user (judgment calls)

1. **Modularization choice (load-bearing).** 2-module vs 3-module vs 4-module DAM split. Unblocks B1-S1/S2/S3/S7/S8/S10/S11/B1-B1/B2/B3 and the B1-M1..M8 routing.
2. **`pim_digital_assets` (816) vs `digital_assets` (137) seam.** PIM masters `pim_digital_assets` in `PIM-DIGITAL-ASSETS` (module 142, `domain_id=167`); DAM masters `digital_assets`. Three options: keep parallel; demote pim_digital_assets to `embedded_master` of DAM master; or merge. Independent of Bucket 3.
3. **`creative_briefs` (483) / `creative_deliverables` (484) placement in DAM modules.** `consumer` vs `embedded_master`. Depends on Bucket 2 item 1.
4. **Regulations on DAM.** Zero `domain_regulations`. Candidates: GDPR/CCPA, Copyright/DMCA, HIPAA (vertical-only), Trademark/FTC. Decide load-now vs defer.
5. **Capability cross-cutting candidates.** `BRAND-MGMT` / `BRAND-GUIDELINES`, `DIGITAL-RIGHTS-MGMT`, `CREATIVE-REVIEW` (already cross-cutting). Decide domain-prefixed vs cross-cutting at A2 load time.
6. **Roles for Brand and Creative function (id 55).** Zero roles loaded. Author now vs defer until after modules ship.

(Continued from 2026-05-30; no user resolutions recorded between then and this audit.)

### Bucket 3, Phase 0 pending (speculative, vendor-research vetting needed)

| # | Candidate | Proposed module | Vendor evidence |
|---|---|---|---|
| B3-1 | `review_rounds` + `review_comments` | DAM-CREATIVE-REVIEW (3-module split) or DAM-DISTRIBUTION | Frontify, Bynder Studio, Adobe AEM Workfront-tie |
| B3-2 | `brand_guidelines` | DAM-DISTRIBUTION (brand-portal slice) or new DAM-BRAND-PORTAL | Bynder, Frontify (flagship), Brandfolder |
| B3-3 | `asset_transformations` | DAM-DISTRIBUTION | Cloudinary (flagship), Imgix, AEM dynamic media |
| B3-4 | `asset_usage_events` | DAM-DISTRIBUTION (analytics slice) | Bynder, Brandfolder analytics, AEM Insights |
| B3-5 | `upload_sessions` | DAM-ASSET-LIB | All flagship DAMs (often modeled as state-machine on digital_assets) |
| B3-6 | `creative_workspaces` / `creative_projects` | DAM-CREATIVE-REVIEW | AEM Workfront, Frontify Workspaces, Brandfolder Workspaces (MRM overlap) |
| B3-7 | `license_agreements` | DAM-RIGHTS-MGMT (4-module) or DAM-ASSET-LIB | Bynder enterprise, AEM, Widen; overlaps with `asset_rights` (B1-M5) |

### Cross-bucket dependencies

- B2-1 (modularization) gates B1-S1/S2/S3/S7/S8/S10/S11/B1-B1/B2/B3 and all B1-M1..M8.
- B2-3 (creative_briefs/deliverables placement) depends on B2-1.
- B3-2 informs B2-5 (BRAND-PORTAL anchor).
- B3-1 and B3-6 inform B2-1 (3- or 4-module split easier to justify if confirmed).
- B1-S12 (em-dash sanitization) is independent and agent-solvable now.
- B1-S13 (H-band catalog quality) is user-judgment (record_status flips per Rule #1).

### Report-only follow-ups (owed by other domains)

| Owning domain | Owed work | Reason |
|---|---|---|
| HCMS (id 93) | B10b on handoff 98 `target_domain_module_id` and on handoff 806 `source_domain_module_id`. | HCMS-side per-module FK patches. |
| AGENCY-MGMT (id 153) | B10b on handoff 344 `source_domain_module_id`. | AGENCY-MGMT-side per-module FK patch. |
| PIM (id 167) | Decision on `pim_digital_assets` (816) vs `digital_assets` (137) seam (Bucket 2 item 2). | PIM-side architectural decision. |

### Continuation from 2026-05-30, status

Three of 12 prior B1 items have shipped (B1-H1/H2/H3 APQC tags). The 9 deferred items remain pending and are re-classified into b1a/b1b/b2 above. Two new findings added (B1-S12 em-dash sanitization in `domains` text, B1-S13 H-band catalog quality), one agent-solvable, one user-judgment.

### JWT errors

None.

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
